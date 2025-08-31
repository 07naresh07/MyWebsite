import os, asyncio, asyncpg, ssl
from dotenv import load_dotenv
load_dotenv()

def make_sslctx():
    try:
        import truststore
        return truststore.SSLContext()
    except Exception:
        try:
            import certifi
            return ssl.create_default_context(cafile=certifi.where())
        except Exception:
            return ssl.create_default_context()

async def main():
    url = os.getenv("DATABASE_URL")
    if not url:
        print("No DATABASE_URL found.")
        return
    sslctx = make_sslctx()
    conn = await asyncpg.connect(url, ssl=sslctx)
    ver = await conn.fetchval("select version();")
    who = await conn.fetchrow("select current_database() as db, current_user as usr;")
    print("Connected OK")
    print(ver)
    print(dict(who))
    await conn.close()

asyncio.run(main())
