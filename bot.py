import os
import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from googletrans import Translator
import yt_dlp

BOT_TOKEN = os.getenv("BOT_TOKEN")

if not BOT_TOKEN:
    raise ValueError("⚠️ BOT_TOKEN مفقود، أضفه في Environment Variables في Render.")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
translator = Translator()

@dp.message(Command("start"))
async def start_handler(message: types.Message):
    await message.answer("👋 مرحبًا بك! أنا بوت ترجمة ومقاطع فيديو.\nاكتب أي نص لترجمته أو أرسل رابط يوتيوب 🎬")

@dp.message()
async def handle_message(message: types.Message):
    text = message.text

    # تحميل فيديو من يوتيوب
    if "youtube.com" in text or "youtu.be" in text:
        await message.reply("🎥 جاري تجهيز الفيديو...")
        ydl_opts = {'quiet': True, 'format': 'best', 'noplaylist': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(text, download=False)
            await message.reply(f"🎬 الفيديو: {info['title']}\n🔗 {info['url']}")
        return

    # ترجمة النص
    translated = translator.translate(text, dest='ar').text
    await message.reply(f"🌍 الترجمة: {translated}")

async def main():
    print("🚀 البوت يعمل الآن...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
