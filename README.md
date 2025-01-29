# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/6aa73ae8-69e0-4e49-ad0d-cbcc85e4f9ca

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/6aa73ae8-69e0-4e49-ad0d-cbcc85e4f9ca) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/6aa73ae8-69e0-4e49-ad0d-cbcc85e4f9ca) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)

# Sample Data Loading Instructions

This directory contains sample data files for initializing your Convex database with test data. The data includes users, accounts, wallets, transactions, messages, contacts, notifications, and activity logs.

## Files Structure

- `users.jsonl`: User profiles and preferences
- `accounts.jsonl`: Personal and business accounts
- `wallets.jsonl`: Spending and savings wallets
- `transactions.jsonl`: Payment transactions
- `messages.jsonl`: User messages and payment requests
- `contacts.jsonl`: User contacts and relationships
- `notifications.jsonl`: System notifications
- `activityLogs.jsonl`: User activity logs

## Loading the Data

### Prerequisites

1. Make sure your Convex development server is running
2. Ensure you have the following environment variables set:
   - `NEXT_PUBLIC_CONVEX_URL`: Your Convex deployment URL

### Method 1: Using the Convex Dashboard

1. Go to your Convex dashboard
2. Navigate to the "Data" tab
3. For each table:
   - Click on the table name
   - Use the "Import" feature
   - Select the corresponding JSONL file
   - Click "Import"

### Method 2: Using the Loading Script

1. Install dependencies:

   ```bash
   npm install convex
   ```

2. Run the loading script:
   ```bash
   npx tsx loadSampleData.ts
   ```

## Data Relationships

The sample data maintains referential integrity across tables:

- Users have corresponding accounts
- Accounts have associated wallets
- Wallets have transactions
- Users have contacts, messages, and notifications
- All activities are logged in activityLogs

## Sample Users

The data includes several sample users, including:

- @dominusmendacium (Dominus Mendacium)
- John Doe
- Jane Smith
- Alice Johnson
- Bob Wilson
- Carol Martinez
- David Brown
- Eva Garcia
- Frank Lee
- Grace Kim

Each user has associated accounts, wallets, and other related data.

## Note

This is sample data for development and testing purposes only. In a production environment, you should use real data and follow proper security practices.
