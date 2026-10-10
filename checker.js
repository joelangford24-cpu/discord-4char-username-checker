const readline = require('readline');
const https = require('https');

const DISCORD_API_URL = 'discord.com/api/v9';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class DiscordUsernameChecker {
  constructor() {
    this.available = [];
    this.taken = [];
    this.invalid = [];
    this.failed = [];
  }

  // Validate username format
  isValidUsername(username) {
    if (typeof username !== 'string') return false;
    username = username.trim();
    if (username.length < 2 || username.length > 32) return false;
    // Allow alphanumeric and underscore only
    return /^[A-Za-z0-9_]{2,32}$/.test(username);
  }

  // Check single username availability
  checkUsername(username) {
    return new Promise((resolve) => {
      username = username.trim();

      if (!this.isValidUsername(username)) {
        resolve({
          username: username,
          available: false,
          status: '❌ Invalid format (2-32 chars, alphanumeric/underscore only)'
        });
        return;
      }

      const options = {
        hostname: DISCORD_API_URL,
        path: `/users/username/${username}`,
        method: 'GET',
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      };

      const req = https.request(options, (res) => {
        if (res.statusCode === 404) {
          resolve({
            username: username,
            available: true,
            status: '✅ AVAILABLE'
          });
        } else if (res.statusCode === 200) {
          resolve({
            username: username,
            available: false,
            status: '❌ TAKEN'
          });
        } else {
          resolve({
            username: username,
            available: null,
            status: `⚠️  Unknown (HTTP ${res.statusCode})`
          });
        }
      });

      req.on('error', (err) => {
        resolve({
          username: username,
          available: null,
          status: `⚠️  Error: ${err.message}`
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          username: username,
          available: null,
          status: '⚠️  Request timeout'
        });
      });

      req.end();
    });
  }

  // Check multiple usernames with delay
  async checkMultiple(usernames, delay = 1000) {
    console.log('\n' + '='.repeat(60));
    console.log('Discord Username Checker - Batch Mode');
    console.log('='.repeat(60) + '\n');

    console.log(`Checking ${usernames.length} username(s)...\n`);

    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i].trim();
      process.stdout.write(`[${i + 1}/${usernames.length}] Checking '${username}'... `);

      const result = await this.checkUsername(username);
      console.log(result.status);

      if (result.available === true) {
        this.available.push(username);
      } else if (result.available === false && result.status.includes('Invalid')) {
        this.invalid.push(username);
      } else if (result.available === false) {
        this.taken.push(username);
      } else {
        this.failed.push(result);
      }

      // Add delay between requests (except last one)
      if (i < usernames.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.printResults();
  }

  // Print results summary
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('RESULTS SUMMARY');
    console.log('='.repeat(60) + '\n');

    if (this.available.length > 0) {
      console.log(`✅ AVAILABLE (${this.available.length}):`);
      this.available.forEach(name => console.log(`   • ${name}`));
      console.log();
    }

    if (this.taken.length > 0) {
      console.log(`❌ TAKEN (${this.taken.length}):`);
      this.taken.forEach(name => console.log(`   • ${name}`));
      console.log();
    }

    if (this.invalid.length > 0) {
      console.log(`⚠️  INVALID (${this.invalid.length}):`);
      this.invalid.forEach(name => console.log(`   • ${name}`));
      console.log();
    }

    if (this.failed.length > 0) {
      console.log(`⚠️  FAILED (${this.failed.length}):`);
      this.failed.forEach(result => console.log(`   • ${result.username}: ${result.status}`));
      console.log();
    }

    console.log('='.repeat(60) + '\n');
  }

  // Generate 4-character combinations
  generate4CharCombos(limit = 1000) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789_'.split('');
    const combos = [];
    let count = 0;

    for (let a of chars) {
      for (let b of chars) {
        for (let c of chars) {
          for (let d of chars) {
            combos.push(a + b + c + d);
            count++;
            if (count >= limit) return combos;
          }
        }
      }
    }
    return combos;
  }
}

// Prompt helper
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Main menu
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('DISCORD 4-CHARACTER USERNAME CHECKER');
  console.log('='.repeat(60));
  console.log('\nOptions:');
  console.log('1) Check single username');
  console.log('2) Check multiple usernames (comma-separated)');
  console.log('3) Scan 4-character combinations');
  console.log('4) Exit\n');

  const choice = await prompt('Enter your choice (1-4): ');
  const checker = new DiscordUsernameChecker();

  if (choice === '1') {
    const username = await prompt('\nEnter username to check: ');
    console.log();
    const result = await checker.checkUsername(username);
    console.log(`${result.username}: ${result.status}\n`);
    await main();
  } else if (choice === '2') {
    const input = await prompt('\nEnter usernames (comma-separated): ');
    const usernames = input.split(',').map(u => u.trim()).filter(u => u);

    if (usernames.length === 0) {
      console.log('No usernames provided.\n');
      await main();
      return;
    }

    await checker.checkMultiple(usernames);
    await main();
  } else if (choice === '3') {
    console.log('\nGenerating 4-character combinations...');
    const combos = checker.generate4CharCombos(1000);
    console.log(`Generated ${combos.length} combinations.\n`);

    const confirmScan = await prompt('Start scanning? (y/n): ');
    if (confirmScan.toLowerCase() === 'y') {
      await checker.checkMultiple(combos, 500);
    }
    await main();
  } else if (choice === '4') {
    console.log('\nGoodbye!\n');
    rl.close();
    process.exit(0);
  } else {
    console.log('\nInvalid choice. Please try again.\n');
    await main();
  }
}

// Start the app
main().catch(console.error);
