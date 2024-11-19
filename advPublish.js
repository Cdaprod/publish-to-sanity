const fs = require('fs');
const path = require('path');
const sanityClient = require('@sanity/client');
const matter = require('gray-matter');
const remark = require('remark');
const remarkParse = require('remark-parse');
const remarkHtml = require('remark-html'); // For simple conversion to HTML
// For more advanced scenarios, use a custom transformer to convert Markdown to Portable Text if needed.

// Initialize the Sanity client
const client = sanityClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false, // `false` ensures fresh data is used
});

// Directory containing Markdown files
const markdownDir = path.join(__dirname, 'markdown-content');

// Function to convert Markdown to Portable Text-compatible format
async function convertMarkdownToPortableText(markdown) {
  const processedContent = await remark()
    .use(remarkParse)
    .use(remarkHtml) // Replace with a custom Portable Text transformer if needed
    .process(markdown);
  return processedContent.toString(); // Use `.result` or `.value` based on transformer output
}

// Function to upload and reference images in Sanity
async function uploadImage(imagePath) {
  const absolutePath = path.join(__dirname, imagePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Image file not found at path: ${imagePath}`);
  }

  const imageData = fs.readFileSync(absolutePath);
  const asset = await client.assets.upload('image', imageData, {
    filename: path.basename(imagePath),
  });

  return asset._id;
}

// Function to create or update a document in Sanity
async function publishToSanity(fileName, frontmatter, markdownContent) {
  const slug = frontmatter.slug || path.parse(fileName).name;
  const portableTextContent = await convertMarkdownToPortableText(markdownContent);

  // Resolve author and category references as needed
  const authorRef = await getAuthorReference(frontmatter.author);
  const categoryRefs = await getCategoryReferences(frontmatter.categories);

  const doc = {
    _type: 'post',
    title: frontmatter.title,
    slug: { current: slug },
    excerpt: frontmatter.excerpt,
    coverImage: {
      _type: 'image',
      asset: { _type: 'reference', _ref: await uploadImage(frontmatter.coverImage) },
      alt: frontmatter.coverImageAlt || '',
    },
    date: frontmatter.date,
    author: authorRef,
    categories: categoryRefs,
    tags: frontmatter.tags || [],
    metaTitle: frontmatter.metaTitle || '',
    metaDescription: frontmatter.metaDescription || '',
    content: portableTextContent, // Ensure this matches the `content` field type in Sanity
  };

  try {
    const existingDoc = await client.fetch(`*[_type == "post" && slug.current == $slug][0]`, { slug });

    if (existingDoc) {
      doc._id = existingDoc._id;
      await client.patch(doc._id).set(doc).commit();
      console.log(`Updated post: ${slug}`);
    } else {
      await client.create(doc);
      console.log(`Created new post: ${slug}`);
    }
  } catch (error) {
    console.error(`Error publishing ${slug}:`, error);
  }
}

// Main function to read Markdown files and publish them
async function main() {
  const files = fs.readdirSync(markdownDir).filter(file => file.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(markdownDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content: markdownContent } = matter(fileContent);

    await publishToSanity(file, frontmatter, markdownContent);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});