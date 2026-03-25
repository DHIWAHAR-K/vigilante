import json
import sys
import traceback


def emit(payload):
    sys.stdout.write(json.dumps(payload) + "\n")
    sys.stdout.flush()


def fetch_url(url):
    from scrapling.fetchers import Fetcher

    page = Fetcher.get(url)

    title = url
    try:
        title = page.css("title::text").get() or url
    except Exception:
        pass

    text = ""
    try:
        parts = page.css("body *::text").getall()
        text = "\n".join(part.strip() for part in parts if part and part.strip())
    except Exception:
        text = ""

    excerpt = text[:500]
    return {
        "ok": True,
        "url": url,
        "title": title,
        "text": text,
        "excerpt": excerpt,
    }


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
            action = request.get("action")
            if action == "fetch":
                emit(fetch_url(request["url"]))
            else:
                emit({"ok": False, "error": f"Unknown action: {action}"})
        except Exception as exc:
            emit(
                {
                    "ok": False,
                    "error": str(exc),
                    "traceback": traceback.format_exc(limit=3),
                }
            )


if __name__ == "__main__":
    main()
