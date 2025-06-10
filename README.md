# E-Signature Workflow Application

A modern web-based electronic signature application built with NestJS and vanilla JavaScript, allowing users to create, manage, and sign documents electronically.

## Features

- Document upload and management
- Electronic signature creation and application
- Multi-party signing workflow
- Email notifications for document signing
- Responsive design for desktop and mobile devices
- Secure document handling
- Real-time signature validation

## Tech Stack

- **Backend**: NestJS (Node.js framework)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **File Handling**: Multer
- **HTTP Client**: Axios
- **Development Tools**: TypeScript, ESLint, Prettier

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- OpenSignLabs API key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd esign-workflow
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Development

To start the development server:

```bash
npm run start:dev
```

This will start the server in watch mode, automatically rebuilding when changes are detected.

## Production

To start the production server:

```bash
npm run start:prod
```

## Available Scripts

- `npm run build` - Builds the application
- `npm run start` - Builds and starts the application
- `npm run start:dev` - Starts the application in development mode
- `npm run start:debug` - Starts the application in debug mode
- `npm run start:prod` - Starts the application in production mode
- `npm run lint` - Runs ESLint to check code quality
- `npm run format` - Formats code using Prettier
- `npm run test` - Runs unit tests
- `npm run test:e2e` - Runs end-to-end tests

## Project Structure

```
esign-workflow/
├── config/           # Configuration files
├── public/           # Static files (HTML, CSS, JS)
├── src/             # Source code
├── test/            # Test files
├── uploads/         # Uploaded documents
└── dist/            # Compiled output
```