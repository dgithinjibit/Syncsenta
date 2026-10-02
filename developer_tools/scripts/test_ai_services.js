#!/usr/bin/env node
/**
 * Test SyncSenta AI Services Integration
 * Tests Groq + AISA.one fallback system
 */

const { config } = require('dotenv');
config();

// Test AISA.one connection
async function testAISA() {
  console.log('🔍 Testing AISA.one connection...');
  
  const AISA_API_KEY = process.env.AISA_API_KEY;
  const AISA_BASE_URL = process.env.AISA_BASE_URL || 'https://api.aisa.one/v1';
  
  if (!AISA_API_KEY) {
    console.log('❌ AISA_API_KEY not found in .env');
    return false;
  }
  
  try {
    const response = await fetch(`${AISA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AISA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-v3',
        messages: [
          { role: 'system', content: 'You are Mwalimu, an AI assistant for Kenya\'s CBC education system.' },
          { role: 'user', content: 'Hello, test connection for SyncSenta' }
        ],
        temperature: 0.3,
        max_tokens: 100
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ AISA.one connected successfully');
      console.log('📝 Response:', data.choices[0].message.content.substring(0, 100) + '...');
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ AISA.one error:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.log('❌ AISA.one connection failed:', error.message);
    return false;
  }
}

// Test Groq connection
async function testGroq() {
  console.log('🔍 Testing Groq connection...');
  
  const GROQ_API_KEY = process.env.QROQ_API_KEY; // Note: your env uses QROQ_API_KEY
  
  if (!GROQ_API_KEY) {
    console.log('❌ GROQ_API_KEY not found in .env');
    return false;
  }
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are Mwalimu, an AI assistant for Kenya\'s CBC education system.' },
          { role: 'user', content: 'Hello, test connection for SyncSenta' }
        ],
        temperature: 0.7,
        max_tokens: 100
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Groq connected successfully');
      console.log('📝 Response:', data.choices[0].message.content.substring(0, 100) + '...');
      return true;
    } else {
      const errorText = await response.text();
      console.log('❌ Groq error:', response.status, errorText);
      return false;
    }
  } catch (error) {
    console.log('❌ Groq connection failed:', error.message);
    return false;
  }
}

// Test CBC-specific prompts
async function testCBCPrompts() {
  console.log('🎓 Testing CBC-specific prompts...');
  
  const testPrompts = [
    {
      grade: 'Grade 4',
      subject: 'Mathematics',
      question: 'Explain addition of two-digit numbers with regrouping'
    },
    {
      grade: 'Grade 2',
      subject: 'English',
      question: 'How do I teach phonics to young learners?'
    },
    {
      grade: 'Grade 6',
      subject: 'Science',
      question: 'Explain the water cycle in simple terms'
    }
  ];
  
  for (const prompt of testPrompts) {
    console.log(`\n📚 Testing: ${prompt.grade} ${prompt.subject}`);
    console.log(`❓ Question: ${prompt.question}`);
    
    // Test with AISA.one (since it's more reliable than Groq rate limits)
    try {
      const response = await fetch(`${process.env.AISA_BASE_URL || 'https://api.aisa.one/v1'}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AISA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-v3',
          messages: [
            { 
              role: 'system', 
              content: `You are Mwalimu, an AI assistant specialized in Kenya's Competency-Based Curriculum (CBC).

Your role:
- Help students, teachers, and parents with CBC-aligned educational content
- Provide responses in English, Kiswahili, or local languages as appropriate
- Ensure all content aligns with KICD standards
- Use culturally relevant examples from Kenyan context
- Be encouraging and supportive in your teaching approach

Current context: ${prompt.grade} ${prompt.subject}

Always provide accurate, helpful, and culturally appropriate responses.`
            },
            { role: 'user', content: prompt.question }
          ],
          temperature: 0.3,
          max_tokens: 300
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ CBC Response:', data.choices[0].message.content.substring(0, 200) + '...');
      } else {
        console.log('❌ CBC test failed for this prompt');
      }
    } catch (error) {
      console.log('❌ CBC test error:', error.message);
    }
  }
}

// Main test function
async function main() {
  console.log('🌱 SyncSenta AI Services Test');
  console.log('=' .repeat(50));
  
  const aisaWorking = await testAISA();
  const groqWorking = await testGroq();
  
  console.log('\n📊 Test Results:');
  console.log(`AISA.one: ${aisaWorking ? '✅ Working' : '❌ Failed'}`);
  console.log(`Groq: ${groqWorking ? '✅ Working' : '❌ Failed'}`);
  
  if (aisaWorking || groqWorking) {
    console.log('\n🎉 At least one AI service is working!');
    
    if (aisaWorking) {
      await testCBCPrompts();
    }
    
    console.log('\n🚀 Next steps:');
    console.log('1. Start the studio frontend: cd studio && npm run dev');
    console.log('2. Test Mwalimu AI at http://localhost:3000');
    console.log('3. Try different grades and subjects');
    console.log('4. Monitor which AI service is being used');
  } else {
    console.log('\n❌ No AI services are working. Check your API keys in .env');
  }
}

main().catch(console.error);