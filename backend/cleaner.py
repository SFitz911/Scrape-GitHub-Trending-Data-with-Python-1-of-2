import pandas as pd
import json
from datetime import datetime, timezone


def load_raw_data(filepath="raw_data.json"):
    """Load raw scraped data from JSON file."""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

# --- Paste the format_stars function below this line ---
# -------------------------------------------------------
def format_stars(count):
    """Format star count for display (e.g., 231K, 1.2M)."""
    if count >= 1_000_000:
        return f"{count / 1_000_000:.1f}M"
    elif count >= 1_000:
        formatted = f"{count / 1_000:.1f}K"
        return formatted.replace(".0K", "K")
    return str(count)

# --- Paste the get_relative_time function below this line ---
# ------------------------------------------------------------
def get_relative_time(updated_at):
    """Convert ISO timestamp to relative time string."""
    if not updated_at:
        return "Unknown"
    try:
        updated = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = now - updated
        hours = int(diff.total_seconds() / 3600)
        if hours < 1:
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes}m ago"
        elif hours < 24:
            return f"{hours}h ago"
        elif hours < 720:
            days = hours // 24
            return f"{days}d ago"
        else:
            months = hours // 720
            return f"{months}mo ago"
    except (ValueError, TypeError):
        return "Unknown"

# --- Paste the derive_status function below this line ---
# --------------------------------------------------------
def derive_status(row):
    """Derive status badge based on repository metrics."""
    if row["stars"] > 200_000:
        return "HOT"
    if row["created_at"]:
        try:
            created = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            hours_since_created = (now - created).total_seconds() / 3600
            if hours_since_created < 24:
                return "NEW"
        except (ValueError, TypeError):
            pass
    if row["stars_today"] > 500:
        return "RISING"
    return ""

# --- Paste the clean_data function below this line ---
# -----------------------------------------------------
def clean_data(raw_data):
    """Clean and transform raw repository data."""
    df = pd.DataFrame(raw_data)

    # Remove duplicates by repository name
    df = df.drop_duplicates(subset="name", keep="first")

    # Handle missing values
    df["description"] = df["description"].fillna("No description available")
    df["language"] = df["language"].fillna("Unknown")
    df["license"] = df["license"].fillna("")
    df["license"] = df["license"].replace("NOASSERTION", "")
    df["updated_at"] = df["updated_at"].fillna("")
    df["created_at"] = df["created_at"].fillna("")

    # Ensure numeric types
    df["stars"] = pd.to_numeric(df["stars"], errors="coerce").fillna(0).astype(int)
    df["forks"] = pd.to_numeric(df["forks"], errors="coerce").fillna(0).astype(int)
    df["issues"] = pd.to_numeric(df["issues"], errors="coerce").fillna(0).astype(int)
    df["stars_today"] = pd.to_numeric(df["stars_today"], errors="coerce").fillna(0).astype(int)

    # Add derived fields
    df["stars_formatted"] = df["stars"].apply(format_stars)
    df["last_updated"] = df["updated_at"].apply(get_relative_time)
    df["status"] = df.apply(derive_status, axis=1)

    return df

# --- Paste the export_to_json function below this line ---
# ---------------------------------------------------------
def export_to_json(df, filepath="data.json"):
    """Export cleaned DataFrame to JSON."""
    output_fields = [
        "name", "description", "stars", "stars_formatted",
        "forks", "issues", "language", "license",
        "last_updated", "status", "url"
    ]
    output_df = df[output_fields]
    records = output_df.to_dict(orient="records")

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    print(f"Exported {len(records)} repositories to {filepath}")

# --- Paste the main function and entry point below this line ---
# ---------------------------------------------------------------
def main():
    print("Loading raw data...")
    raw_data = load_raw_data()
    print(f"Loaded {len(raw_data)} repositories.\n")

    print("Cleaning and transforming data...")
    df = clean_data(raw_data)

    print(f"\nDataset Summary:")
    print(f"  Total repositories: {len(df)}")
    print(f"  Languages: {df['language'].nunique()}")
    print(f"  Avg stars: {df['stars'].mean():,.0f}")
    print(f"  Status breakdown:")
    status_counts = df["status"].value_counts()
    for status, count in status_counts.items():
        label = status if status else "(none)"
        print(f"    {label}: {count}")

    print()
    export_to_json(df)


if __name__ == "__main__":
    main()