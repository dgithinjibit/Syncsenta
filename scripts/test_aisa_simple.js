#!/usr/bin/env node
/**
 * Simple AISA.one Test for SyncSenta
 * No dependencies required
 */

// Read .env file manually
const fs = require('fs');
const path = require('path');

function loadEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
    
    return env;
  } catch (error) {
    console.log('⚠️  .env file not found, using .env.example values');
    return {
      AISA_API_KEY: '<REDACTED_SECRET>',
      AISA_BASE_URL: 'https://api.aisa.one/v1'
    };
  }
}

async function testAISA() {
  console.log('🌱 SyncSenta AISA.one Test');
  console.log('=' .repeat(40));
  
  const env = loadEnv();
  const AISA_API_KEY = env.AISA_API_KEY;
  const AISA_BASE_URL = env.AISA_BASE_URL || 'https://api.aisa.one/v1';
  
  console.log('🔑 API Key:', AISA_API_KEY ? `${AISA_API_KEY.substring(0, 10)}...` : 'Not found');
  console.log('🌐 Base URL:', AISA_BASE_URL);
  
  if (!AISA_API_KEY) {
    console.log('❌ AISA_API_KEY not found');
    return;
  }
  
  console.log('\n🔍 Testing connection...');
  
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
          { 
            role: 'system', 
            content: 'You are Mwalimu, an AI assistant for Kenya\'s CBC education system. Respond in a friendly, educational manner.' 
          },
          { 
            role: 'user', 
            content: 'Hello! I am testing SyncSenta\'s AI integration. Please introduce yourself and explain how you can help Kenyan students with CBC curriculum.' 
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      })
    });
    
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ AISA.one connection successful!');
      console.log('\n🤖 Mwalimu AI Response:');
      console.log('─'.repeat(50));
      console.log(data.choices[0].message.content);
      console.log('─'.repeat(50));
      
      console.log('\n📊 Usage Stats:');
      console.log(`Tokens used: ${data.usage.total_tokens}`);
      console.log(`Model: ${data.model}`);
      
      console.log('\n🎉 Success! Your AI integration is working.');
      console.log('\n🚀 Next steps:');
      console.log('1. Start studio: npm run dev (in studio directory)');
      console.log('2. Visit: http://localhost:3000');
      console.log('3. Test Mwalimu AI in the student dashboard');
      
    } else {
      const errorText = await response.text();
      console.log('❌ AISA.one error:', response.status);
      console.log('Error details:', errorText);
      
      if (response.status === 401) {
        console.log('\n💡 Possible solutions:');
        console.log('- Check if your AISA_API_KEY is correct');
        console.log('- Verify the API key hasn\'t expired');
        console.log('- Make sure you have credits remaining');
      }
    }
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 This might be a network issue:');
      console.log('- Check your internet connection');
      console.log('- Try again in a few minutes');
      console.log('- Verify AISA.one service is available');
    }
  }
}

// Test CBC-specific functionality
async function testCBCScenarios() {
  console.log('\n📚 Testing CBC Education Scenarios...');
  
  const env = loadEnv();
  const scenarios = [
    {
      grade: 'Grade 4',
      subject: 'Mathematics', 
      prompt: 'A student is struggling with multiplication tables. How can I help them learn 7 × 8 using Kenyan examples?'
    },
    {
      grade: 'Grade 2',
      subject: 'Kiswahili',
      prompt: 'Nisaidie kuelewa jinsi ya kusoma maneno ya Kiswahili kwa urahisi.'
    }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\n🎓 Testing: ${scenario.grade} ${scenario.subject}`);
    
    try {
      const response = await fetch(`${env.AISA_BASE_URL || 'https://api.aisa.one/v1'}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.AISA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-v3',
          messages: [
            { 
              role: 'system', 
              content: `You are Mwalimu, specialized in Kenya's CBC curriculum for ${scenario.grade} ${scenario.subject}. Use Kenyan cultural context and examples.` 
            },
            { role: 'user', content: scenario.prompt }
          ],
          temperature: 0.3,
          max_tokens: 150
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Response:', data.choices[0].message.content.substring(0, 100) + '...');
      } else {
        console.log('❌ Failed for this scenario');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }
}

// Main execution
async function main() {
  await testAISA();
  
  // Only run CBC tests if basic test passed
  const env = loadEnv();
  if (env.AISA_API_KEY) {
    await testCBCScenarios();
  }
}

main().catch(console.error);