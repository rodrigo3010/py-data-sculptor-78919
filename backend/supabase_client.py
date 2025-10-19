from os import getenv
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables if using .env file
load_dotenv()

# Supabase configuration
SUPABASE_URL = "https://syqvsnlqexyxleuabdvv.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5cXZzbmxxZXh5eGxldWFiZHZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNDYzNzAsImV4cCI6MjA3NTYyMjM3MH0.fhHO5pYkHSZzM_yxg0MZrRRVPdC1FCZoxvdgOcZrviM"


def get_supabase_client() -> Client:
    """
    Creates and returns a Supabase client instance.
    Uses environment variables or default values for configuration.

    Returns:
        Client: Configured Supabase client
    """
    url = getenv("SUPABASE_URL", SUPABASE_URL)
    key = getenv("SUPABASE_KEY", SUPABASE_KEY)

    return create_client(url, key)


# Create a default client instance
supabase: Client = get_supabase_client()
