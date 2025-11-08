/**
 * Figma Design Specs Extractor
 * 
 * This script fetches design specifications from Figma using their REST API
 * 
 * Usage:
 * 1. Get your Figma Personal Access Token from: https://www.figma.com/developers/api#access-tokens
 * 2. Set FIGMA_TOKEN environment variable or pass it as argument
 * 3. Run: node scripts/figma-extract.js
 * 
 * The script will extract:
 * - Frame dimensions
 * - Component specifications
 * - Spacing and layout information
 * - Typography details
 * - Color values
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Figma file key from URL: https://www.figma.com/design/iLIAaLmkmb27dy98YQjw3n/Untitled?node-id=1-548&m=dev
const FIGMA_FILE_KEY = 'iLIAaLmkmb27dy98YQjw3n';
const NODE_ID = '1-548'; // The specific frame we want

// Get token from environment or command line
const FIGMA_TOKEN = process.env.FIGMA_TOKEN || process.argv[2];

if (!FIGMA_TOKEN) {
  console.error('❌ Error: Figma Personal Access Token required!');
  console.log('\n📝 How to get your token:');
  console.log('1. Go to https://www.figma.com/');
  console.log('2. Settings → Account → Personal Access Tokens');
  console.log('3. Generate a new token');
  console.log('4. Run: FIGMA_TOKEN=your_token node scripts/figma-extract.js');
  console.log('   OR: node scripts/figma-extract.js your_token');
  process.exit(1);
}

/**
 * Make API request to Figma
 */
function figmaRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.figma.com',
      path: endpoint,
      method: 'GET',
      headers: {
        'X-Figma-Token': FIGMA_TOKEN
      }
    };

    https.get(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse response: ' + e.message));
          }
        } else {
          reject(new Error(`API Error: ${res.statusCode} - ${data}`));
        }
      });
    }).on('error', (e) => {
      reject(e);
    });
  });
}

/**
 * Extract design specifications from a node
 */
function extractSpecs(node, depth = 0) {
  const indent = '  '.repeat(depth);
  const specs = {
    name: node.name,
    type: node.type,
    dimensions: null,
    layout: null,
    typography: null,
    colors: null,
    spacing: null,
    children: []
  };

  // Extract dimensions
  if (node.absoluteBoundingBox) {
    specs.dimensions = {
      width: node.absoluteBoundingBox.width,
      height: node.absoluteBoundingBox.height,
      x: node.absoluteBoundingBox.x,
      y: node.absoluteBoundingBox.y
    };
  }

  // Extract layout properties
  if (node.layoutMode) {
    specs.layout = {
      mode: node.layoutMode, // HORIZONTAL or VERTICAL
      paddingLeft: node.paddingLeft,
      paddingRight: node.paddingRight,
      paddingTop: node.paddingTop,
      paddingBottom: node.paddingBottom,
      itemSpacing: node.itemSpacing,
      layoutAlign: node.layoutAlign,
      layoutGrow: node.layoutGrow
    };
  }

  // Extract typography
  if (node.style) {
    specs.typography = {
      fontFamily: node.style.fontFamily,
      fontSize: node.style.fontSize,
      fontWeight: node.style.fontWeight,
      lineHeight: node.style.lineHeightPx || node.style.lineHeightPercentFontSize,
      letterSpacing: node.style.letterSpacing,
      textAlign: node.style.textAlign,
      textDecoration: node.style.textDecoration
    };
  }

  // Extract colors
  if (node.fills && node.fills.length > 0) {
    specs.colors = node.fills.map(fill => {
      if (fill.type === 'SOLID' && fill.color) {
        const { r, g, b, a } = fill.color;
        return {
          type: 'solid',
          rgba: `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a || 1})`,
          hex: rgbToHex(r, g, b, a)
        };
      }
      return fill;
    });
  }

  // Extract spacing (padding, margin equivalents)
  if (node.paddingLeft || node.paddingRight || node.paddingTop || node.paddingBottom) {
    specs.spacing = {
      padding: {
        left: node.paddingLeft || 0,
        right: node.paddingRight || 0,
        top: node.paddingTop || 0,
        bottom: node.paddingBottom || 0
      }
    };
  }

  // Extract corner radius
  if (node.cornerRadius) {
    specs.borderRadius = node.cornerRadius;
  }

  // Recursively process children
  if (node.children && node.children.length > 0) {
    specs.children = node.children.map(child => extractSpecs(child, depth + 1));
  }

  return specs;
}

/**
 * Convert RGB to Hex
 */
function rgbToHex(r, g, b, a = 1) {
  const toHex = (n) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${a < 1 ? toHex(a) : ''}`;
}

/**
 * Find node by ID in the tree
 */
function findNodeById(nodes, nodeId) {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }
    if (node.children) {
      const found = findNodeById(node.children, nodeId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Fetching Figma design specifications...\n');
  console.log(`📁 File: ${FIGMA_FILE_KEY}`);
  console.log(`🎯 Node ID: ${NODE_ID}\n`);

  try {
    // Get file data
    console.log('📡 Fetching file data...');
    const fileData = await figmaRequest(`/v1/files/${FIGMA_FILE_KEY}`);
    
    if (!fileData.document) {
      throw new Error('Invalid file data received');
    }

    // Find the specific node
    console.log('🔍 Searching for node...');
    const targetNode = findNodeById([fileData.document], NODE_ID);

    if (!targetNode) {
      console.error(`❌ Node ${NODE_ID} not found in the file`);
      console.log('\nAvailable top-level nodes:');
      fileData.document.children?.forEach(child => {
        console.log(`  - ${child.name} (${child.id})`);
      });
      return;
    }

    console.log(`✅ Found node: ${targetNode.name}\n`);

    // Extract specifications
    console.log('📊 Extracting specifications...');
    const specs = extractSpecs(targetNode);

    // Save to file
    const outputPath = path.join(__dirname, '../figma-specs.json');
    fs.writeFileSync(outputPath, JSON.stringify(specs, null, 2));

    console.log(`\n✅ Specifications extracted successfully!`);
    console.log(`📄 Saved to: ${outputPath}\n`);

    // Print summary
    console.log('📋 Summary:');
    console.log(`   Name: ${specs.name}`);
    console.log(`   Type: ${specs.type}`);
    if (specs.dimensions) {
      console.log(`   Dimensions: ${specs.dimensions.width}px × ${specs.dimensions.height}px`);
    }
    if (specs.typography) {
      console.log(`   Font: ${specs.typography.fontFamily} ${specs.typography.fontSize}px`);
    }
    if (specs.colors && specs.colors.length > 0) {
      console.log(`   Colors: ${specs.colors.length} fill(s)`);
    }
    console.log(`   Children: ${specs.children.length} element(s)\n`);

    // Generate CSS comparison
    console.log('💡 Next steps:');
    console.log('   1. Review figma-specs.json for detailed specifications');
    console.log('   2. Compare with current implementation in frontend/src/App.css');
    console.log('   3. Update CSS to match Figma design\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('401') || error.message.includes('403')) {
      console.log('\n💡 Tip: Make sure your Figma token is valid and has access to this file.');
    }
    process.exit(1);
  }
}

// Run the script
main();




