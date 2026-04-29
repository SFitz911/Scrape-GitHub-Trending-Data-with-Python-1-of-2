import requests
from bs4 import BeautifulSoup
import json
import time

# Target URLs for scraping and API enrichment
TRENDING_URL = "https://github.com/trending"
API_BASE_URL = "https://api.github.com/repos"

# Browser-like headers so GitHub does not reject the request
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# GitHub's recommended header format for REST API calls
API_HEADERS = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "GitHub-Trending-Scraper",
}

def fetch_trending_page():
    """Fetch the GitHub Trending page HTML."""
    # Send a GET request with browser-like headers
    response = requests.get(TRENDING_URL, headers=HEADERS)
    # Stop execution if the request failed
    response.raise_for_status()
    return response.text

def parse_trending_repos(html):
    """Parse trending repositories from HTML."""
    soup = BeautifulSoup(html, "html.parser")
    repos = []

    # Loop through each trending repo on the page
    for article in soup.find_all("article", class_="Box-row"):
        # Extract the repo name and URL from the title link
        title_tag = article.find("h2").find("a")
        href = title_tag["href"].strip()
        name = href.strip("/")
        url = f"https://github.com{href}"

        # Get the description, defaulting to empty string
        desc_tag = article.find("p", class_="col-9")
        description = desc_tag.get_text(strip=True) if desc_tag else ""

        # Get the programming language
        lang_tag = article.find("span", attrs={"itemprop": "programmingLanguage"})
        language = lang_tag.get_text(strip=True) if lang_tag else ""

        # Extract total star count from the stargazers link
        stars_tag = article.find("a", href=lambda h: h and "/stargazers" in h)
        stars_text = stars_tag.get_text(strip=True) if stars_tag else "0"
        stars = int(stars_text.replace(",", ""))

        # Extract fork count from the network/members link
        forks_tag = article.find("a", href=lambda h: h and "/network/members" in h)
        forks_text = forks_tag.get_text(strip=True) if forks_tag else "0"
        forks = int(forks_text.replace(",", ""))

        # Extract "stars today" count from the daily stats span
        today_tag = article.find("span", class_="d-inline-block float-sm-right")
        stars_today = 0
        if today_tag:
            today_text = today_tag.get_text(strip=True)
            # Text looks like "7,429 stars today", grab just the number
            stars_today = int(today_text.split()[0].replace(",", ""))

        repos.append({
            "name": name,
            "description": description,
            "language": language,
            "stars": stars,
            "forks": forks,
            "stars_today": stars_today,
            "url": url,
        })

    return repos

def enrich_with_api(repos):
    """Enrich repository data using the GitHub REST API."""
    enriched = []
    total = len(repos)

    for i, repo in enumerate(repos, 1):
        print(f"  Enriching {i}/{total}: {repo['name']}")
        api_url = f"{API_BASE_URL}/{repo['name']}"

        try:
            response = requests.get(api_url, headers=API_HEADERS)
            if response.status_code == 200:
                data = response.json()
                # Pull fields that aren't on the trending page
                repo["issues"] = data.get("open_issues_count", 0)
                license_info = data.get("license")
                repo["license"] = license_info.get("spdx_id", "") if license_info else ""
                repo["created_at"] = data.get("created_at", "")
                repo["updated_at"] = data.get("updated_at", "")
            else:
                # Set defaults if the API call failed
                repo["issues"] = 0
                repo["license"] = ""
                repo["created_at"] = ""
                repo["updated_at"] = ""
                print(f"    API returned {response.status_code} for {repo['name']}")
        except requests.RequestException as e:
            # Handle network errors gracefully
            repo["issues"] = 0
            repo["license"] = ""
            repo["created_at"] = ""
            repo["updated_at"] = ""
            print(f"    Error: {e}")

        enriched.append(repo)
        # Polite pause between API calls to avoid rate limiting
        time.sleep(1)

    return enriched

def main():
    print("Fetching GitHub Trending page...")
    html = fetch_trending_page()

    print("Parsing trending repositories...")
    repos = parse_trending_repos(html)
    print(f"Found {len(repos)} trending repositories.\n")

    print("Enriching with GitHub API data...")
    repos = enrich_with_api(repos)

    # Save the enriched data to a JSON file
    with open("raw_data.json", "w", encoding="utf-8") as f:
        json.dump(repos, f, indent=2, ensure_ascii=False)

    print(f"\nRaw data saved to raw_data.json")


if __name__ == "__main__":
    main()

    