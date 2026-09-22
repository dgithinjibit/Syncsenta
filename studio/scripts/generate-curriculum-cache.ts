/**
 * Generate Curriculum Cache
 * 
 * This script extracts curriculum data from scheme-scribe-ai repo
 * and stores it in a JSON file for fast lookup by Mwalimu AI
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { extractCurriculumData } from '../src/lib/curriculum-extractor';

async function generateCurriculumCache() {
  console.log('🔄 Extracting curriculum data from scheme-scribe-ai...');
  
  try {
    const curriculumData = await extractCurriculumData();
    
    console.log(`✅ Extracted ${curriculumData.length} curriculum datasets`);
    
    // Store in public directory for easy access
    const outputPath = join(process.cwd(), 'public', 'curriculum-cache.json');
    writeFileSync(outputPath, JSON.stringify(curriculumData, null, 2));
    
    console.log(`✅ Curriculum cache saved to: ${outputPath}`);
    console.log('\nDatasets generated:');
    curriculumData.forEach((data) => {
      const totalStrands = data.strands.length;
      const totalSubStrands = data.strands.reduce(
        (sum, strand) => sum + strand.subStrands.length,
        0
      );
      console.log(`  - ${data.grade} ${data.subject}: ${totalStrands} strands, ${totalSubStrands} sub-strands`);
    });
    
  } catch (error) {
    console.error('❌ Error generating curriculum cache:', error);
    process.exit(1);
  }
}

generateCurriculumCache();
