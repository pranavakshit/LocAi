import sys
try:
    from ddgs import DDGS
    with DDGS() as ddgs:
        results = list(ddgs.text("SpaceX", max_results=3))
        print(f"SUCCESS: {len(results)} results")
        for r in results:
            print(r.get('title'))
except Exception as e:
    print(f"ERROR: {e}")
