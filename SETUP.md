# Setup Instructions

## Prerequisites

You need Node.js and npm installed on your system.

### Install Node.js on macOS

Using Homebrew (recommended):
```bash
brew install node
```

Or download from: https://nodejs.org/

Verify installation:
```bash
node --version
npm --version
```

## Installation & Running

1. **Install dependencies**:
```bash
cd /Users/mcolomerc/flink-calc
npm install
```

2. **Start development server**:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

3. **Build for production**:
```bash
npm run build
```

Built files will be in the `dist/` directory.

## First Time Usage

1. Open `http://localhost:3000` in your browser
2. You'll start at the Workload configuration page
3. Follow the 4-step wizard:
   - **Workload**: Configure input rates and SLA requirements
   - **Environment**: Set TaskManager and checkpoint settings
   - **Topology**: Build your operator graph (or load sample)
   - **Results**: Calculate and view your estimates

## Troubleshooting

### Port already in use
If port 3000 is busy, edit `vite.config.js` and change the port number.

### Module not found errors
Run `npm install` again to ensure all dependencies are installed.

### Browser compatibility
Use a modern browser (Chrome, Firefox, Safari, Edge) with ES6 support.
