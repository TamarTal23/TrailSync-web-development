// ts file, commonjs
import fs from 'fs';
import path from 'path';

// project root
const rootDir = process.cwd();

const files = [
  'paris-eiffel.jpg',
  'paris-louvre.jpg',
  'tokyo-shibuya.jpg',
  'tokyo-temple.jpg',
  'tokyo-food.jpg',
  'nyc-skyline.jpg',
  'kenya-safari1.jpg',
  'kenya-safari2.jpg',
  'kenya-wildlife.jpg',
  'bali-beach.jpg',
  'bali-temple.jpg',
];

// Assets directory in project root
const dir = path.join(rootDir, 'src', 'tests', 'assets');

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const jpgBuffer = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/...base64...', 'base64');

files.forEach((file) => {
  fs.writeFileSync(path.join(dir, file), jpgBuffer);
});
