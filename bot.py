
from aiogram import Bot, Dispatcher, types
from aiogram.utils import executor
from googletrans import Translator

BOT_TOKEN = ""

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(bot)
translator = Translator()

@dp.message_handler(commands=['start'])
async def start(message: types.Message):
    await message.reply("👋 مرحبًا بك! أنا بوت ترجمة ومقاطع فيديو.
اكتب أي جملة لأترجمها، أو أرسل رابط يوتيوب لتنزيله 🎬")

@dp.message_handler()
async def handle_message(message: types.Message):
    text = message.text

    # إذا كان الرابط من يوتيوب
    if "youtube.com" in text or "youtu.be" in text:
        await message.reply("🎥 جاري تنزيل الفيديو...")
        import yt_dlp
        with yt_dlp.YoutubeDL({'outtmpl': '%(title)s.%(ext)s'}) as ydl:
            info = ydl.extract_info(text, download=False)
            url = info['url']
            await message.reply(f"🎬 الفيديو جاهز:
{url}")
        return

    # غير ذلك، ترجم النص
    translated = translator.translate(text, dest='ar').text
    await message.reply(f"🌐 الترجمة: {translated}")

if __name__ == '__main__':
    print("🚀 البوت يعمل الآن...")
    executor.start_polling(dp)
