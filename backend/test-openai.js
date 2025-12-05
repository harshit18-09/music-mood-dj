require('dotenv').config();
const OpenAI = require('openai');

async function testOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY is not set in .env file');
    console.log('📝 Get your key from: https://platform.openai.com/api-keys');
    return;
  }

  console.log('🔑 Testing OpenAI API key...');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say 'OpenAI is working!'" }],
      max_tokens: 10
    });

    console.log('✅ OpenAI is working!');
    console.log('📋 Response:', response.choices[0].message.content);
    console.log('💰 Model:', response.model);
    console.log('📊 Usage:', response.usage);
    
  } catch (error) {
    console.error('❌ OpenAI API Error:', error.message);
    
    if (error.status === 401) {
      console.log('🔑 Issue: Invalid API key');
      console.log('💡 Solution: Get a new key from https://platform.openai.com/api-keys');
    } else if (error.status === 429) {
      console.log('💰 Issue: No credits or rate limit');
      console.log('💡 Solution: Add payment method at https://platform.openai.com/account/billing');
    } else {
      console.log('🔧 Check your internet connection');
    }
  }
}

testOpenAI();