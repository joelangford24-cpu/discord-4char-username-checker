import socket
import requests
import time
from typing import List, Dict

# Discord API endpoint for checking username availability
DISCORD_API_URL = "https://discord.com/api/v9"

class DiscordUsernameChecker:
    def __init__(self):
        self.available_usernames = []
        self.taken_usernames = []
        self.failed_checks = []
        
    def check_internet_connection(self) -> bool:
        """Check if device has internet connection"""
        try:
            socket.create_connection(("8.8.8.8", 53), timeout=2)
            return True
        except (socket.timeout, socket.error):
            return False
    
    def check_username_availability(self, username: str) -> Dict[str, any]:
        """
        Check if a Discord username is available
        Returns: {'username': str, 'available': bool, 'status': str}
        """
        if not self.validate_username_format(username):
            return {
                'username': username,
                'available': False,
                'status': 'Invalid format (must be 2-32 chars, alphanumeric/underscore)'
            }
        
        try:
            # Discord doesn't have a direct "check availability" endpoint
            # This approach attempts to create a temporary test
            response = requests.get(
                f"{DISCORD_API_URL}/users/username/{username}",
                timeout=5
            )
            
            if response.status_code == 404:
                # Username not found = available
                return {
                    'username': username,
                    'available': True,
                    'status': '✓ AVAILABLE'
                }
            elif response.status_code == 200:
                # Username exists = taken
                return {
                    'username': username,
                    'available': False,
                    'status': '✗ TAKEN'
                }
            else:
                return {
                    'username': username,
                    'available': None,
                    'status': f'Unknown (Status: {response.status_code})'
                }
                
        except requests.exceptions.RequestException as e:
            return {
                'username': username,
                'available': None,
                'status': f'Error: {str(e)}'
            }
    
    @staticmethod
    def validate_username_format(username: str) -> bool:
        """Validate Discord username format"""
        if not isinstance(username, str):
            return False
        if len(username) < 2 or len(username) > 32:
            return False
        # Allow alphanumeric and underscore
        return all(c.isalnum() or c == '_' for c in username)
    
    def check_multiple_usernames(self, usernames: List[str], delay: float = 1.0) -> None:
        """Check multiple usernames with delay to avoid rate limiting"""
        print(f"\n{'='*60}")
        print(f"Discord Username Availability Checker")
        print(f"{'='*60}\n")
        
        if not self.check_internet_connection():
            print("❌ No internet connection detected!")
            print("Please connect to WiFi and try again.\n")
            return
        
        print(f"Checking {len(usernames)} username(s)...\n")
        
        for i, username in enumerate(usernames, 1):
            print(f"[{i}/{len(usernames)}] Checking '{username}'...", end=" ", flush=True)
            
            result = self.check_username_availability(username)
            print(result['status'])
            
            if result['available']:
                self.available_usernames.append(username)
            elif result['available'] is False and result['status'] != '✗ TAKEN':
                self.failed_checks.append(result)
            else:
                self.taken_usernames.append(username)
            
            # Add delay to avoid rate limiting (except on last check)
            if i < len(usernames):
                time.sleep(delay)
        
        self.print_results()
    
    def print_results(self) -> None:
        """Print summary of results"""
        print(f"\n{'='*60}")
        print(f"RESULTS SUMMARY")
        print(f"{'='*60}\n")
        
        if self.available_usernames:
            print(f"✓ AVAILABLE ({len(self.available_usernames)}):")
            for username in self.available_usernames:
                print(f"  - {username}")
            print()
        
        if self.taken_usernames:
            print(f"✗ TAKEN ({len(self.taken_usernames)}):")
            for username in self.taken_usernames:
                print(f"  - {username}")
            print()
        
        if self.failed_checks:
            print(f"⚠ FAILED ({len(self.failed_checks)}):")
            for result in self.failed_checks:
                print(f"  - {result['username']}: {result['status']}")
            print()
        
        print(f"{'='*60}\n")


def main():
    checker = DiscordUsernameChecker()
    
    print("\n" + "="*60)
    print("DISCORD 4-CHARACTER USERNAME CHECKER")
    print("="*60)
    print("\nOptions:")
    print("1. Check single username")
    print("2. Check multiple usernames")
    print("3. Scan 4-letter combinations (wordlist)")
    print("\nEnter your choice (1-3): ", end="")
    
    choice = input().strip()
    
    if choice == "1":
        username = input("\nEnter username to check: ").strip()
        result = checker.check_username_availability(username)
        print(f"\n{result['username']}: {result['status']}\n")
    
    elif choice == "2":
        print("\nEnter usernames (comma-separated):")
        usernames_input = input().strip()
        usernames = [u.strip() for u in usernames_input.split(',')]
        checker.check_multiple_usernames(usernames)
    
    elif choice == "3":
        print("\nGenerating and checking 4-letter combinations...")
        print("This may take a while. Generating from: a-z, 0-9, _")
        
        import string
        chars = string.ascii_lowercase + string.digits + '_'
        four_letter_combos = []
        
        # Generate 4-letter combinations (sample for demo)
        print("Generating combinations (limiting to first 1000 for demo)...\n")
        count = 0
        for c1 in chars:
            for c2 in chars:
                for c3 in chars:
                    for c4 in chars:
                        four_letter_combos.append(f"{c1}{c2}{c3}{c4}")
                        count += 1
                        if count >= 1000:  # Limit for demo
                            break
                    if count >= 1000:
                        break
                if count >= 1000:
                    break
            if count >= 1000:
                break
        
        print(f"Generated {len(four_letter_combos)} combinations to check.\n")
        input("Press Enter to start checking (this will take several minutes)...")
        checker.check_multiple_usernames(four_letter_combos, delay=0.5)
    
    else:
        print("\nInvalid choice!")


if __name__ == "__main__":
    main()
