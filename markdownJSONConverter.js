// Example utility functions for schema field types

/**
 * Parses a string field with a validation check.
 * @param {string} value - The value to parse.
 * @returns {string} - Validated string.
 */
function parseStringField(value) {
  if (typeof value !== 'string') {
    throw new Error('Expected a string value');
  }
  return value.trim();
}

/**
 * Generates a slug from a given string.
 * @param {string} title - The title to generate the slug from.
 * @param {number} maxLength - Max length for the slug.
 * @returns {string} - URL-friendly slug.
 */
function parseSlugField(title, maxLength = 96) {
  return slugify(title, { lower: true, strict: true }).slice(0, maxLength);
}

/**
 * Parses a datetime field to ISO format.
 * @param {string} date - The date string.
 * @returns {string} - ISO formatted date string.
 */
function parseDateTimeField(date) {
  return date ? new Date(date).toISOString() : new Date().toISOString();
}

/**
 * Parses a reference field.
 * @param {string} ref - The ID reference for the field.
 * @returns {Object} - The reference object.
 */
function parseReferenceField(ref) {
  if (!ref) {
    throw new Error('Expected a reference ID');
  }
  return {
    _type: 'reference',
    _ref: ref,
  };
}

/**
 * Parses content into block format for the 'content' field.
 * @param {string} content - The markdown content.
 * @returns {Array} - Array of block objects.
 */
function parseContentBlocks(content) {
  return content.split('\n\n').map((block) => ({
    _type: 'block',
    children: [
      {
        _type: 'span',
        text: block,
      },
    ],
    markDefs: [],
    style: 'normal',
  }));
}

function convertMarkdownToJson(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);

  return {
    title: parseStringField(data.title || 'Untitled'),
    slug: data.slug || parseSlugField(data.title),
    content: parseContentBlocks(content),
    excerpt: parseStringField(data.excerpt || content.split('\n')[0].slice(0, 160)),
    coverImage: data.coverImage || null,
    date: parseDateTimeField(data.date),
    author: parseReferenceField(data.author),
  };
}
