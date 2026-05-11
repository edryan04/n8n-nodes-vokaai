const path = require('path');
const { task, src, dest } = require('gulp');

/**
 * Copies node + credential SVG icons from src into the dist tree where n8n
 * expects them at runtime. n8n's loader looks for icons co-located with the
 * compiled .node.js / .credentials.js files.
 */
task('build:icons', copyIcons);

function copyIcons() {
  const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
  const nodeDestination = path.resolve('dist', 'nodes');

  src(nodeSource).pipe(dest(nodeDestination));

  const credSource = path.resolve('credentials', '**', '*.{png,svg}');
  const credDestination = path.resolve('dist', 'credentials');

  return src(credSource).pipe(dest(credDestination));
}
