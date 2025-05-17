# Runner Lookup Tool

A responsive, browser-based tool designed for race announcers and event officials to quickly look up and display information about race participants. This application allows for real-time searching by runner number or name, making it ideal for use during races and sporting events.

## Features

- **Instant Search**: Type a race number or name to immediately see matching runners
- **Global Keyboard Capture**: Type anywhere to search (no need to focus on the input field)
- **Auto-Reset**: Input field automatically resets on new input after a configurable timeout period
- **Sortable Table**: View all runners in a sortable table with various column options
- **Visual Indicators**: Color changes and visual cues indicate when the tool is ready for new input
- **Responsive Design**: Works on both desktop and mobile devices
- **Offline Support**: All data is loaded from a local JSON file (no internet required)

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari)
- A web server for hosting the files (local or online) to bypass cross-origin loading restrictions

### Installation

1. Clone the repository or download the files
2. Prepare your `runners.json` file (see format below)
3. Open `index.html` in a web browser or serve it through a web server

```bash
# If using Node.js server (optional)
node server.js
```

## Usage

1. **Searching for a Runner**: 
   - Simply start typing a race number or name anywhere on the screen
   - Results will appear instantly as you type
   - The application will highlight the most relevant match

2. **Table Navigation**:
   - Click on column headers to sort the table
   - Click on any row to select that runner

3. **Keyboard Shortcuts**:
   - `Enter`: Confirm search
   - `Escape`: Clear input
   - `Backspace`: Delete characters

## `runners.json` Format

The application requires a JSON file named `runners.json` in the root directory. This file should contain an array of runner objects with the following structure:

```json
[
  {
    "race_no": 123,       // Required: Unique runner number (numeric)
    "full_name": "John Doe", // Required: Runner's full name
    "age": 35,            // Optional: Runner's age (numeric)
    "category": "M35",    // Optional: Age/gender category
    "club": "Running Club"  // Optional: Club or team name
  },
  {
    "race_no": 456,
    "full_name": "Jane Smith",
    "age": 28,
    "category": "F25",
    "club": "Fast Feet Runners"
  }
]
```

### Required Fields

- `race_no`: A unique number identifying the runner (numeric value)
- `full_name`: The runner's full name (string)

### Optional Fields

- `age`: The runner's age (numeric)
- `category`: The runner's category (e.g., age group, gender category)
- `club`: The runner's club or team name

### Example

```json
[
  {
    "race_no": 101,
    "full_name": "Michael Johnson",
    "age": 42,
    "category": "M40",
    "club": "City Striders"
  },
  {
    "race_no": 202,
    "full_name": "Sarah Williams",
    "age": 29,
    "category": "F25",
    "club": "Marathon Masters"
  },
  {
    "race_no": 303,
    "full_name": "David Chen",
    "age": 35,
    "category": "M35",
    "club": null
  }
]
```

## How It Works

The application loads runner data from `runners.json` at startup. When a user types a race number or name, the tool filters and displays matching runners. After a brief period of inactivity (3 seconds by default), the input field is marked as ready to reset, which will clear the field on the next keystroke.

The tool is designed to be used in race environments where quick lookups are essential, and the auto-reset feature helps announcers quickly move from one runner to the next without manual clearing.

## File Structure

- `index.html` - Main HTML file
- `styles.css` - CSS styling
- `script.js` - JavaScript functionality
- `runners.json` - Runner data in JSON format

## Customization

You can customize the application by:

1. Adjusting the reset timeout in `script.js` (currently set to 3000ms)
2. Modifying colors and styling in `styles.css`
3. Adding additional fields to the runner data (may require code modifications)

## Browser Compatibility

The tool is compatible with all modern browsers including:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Acknowledgments

- Coded by Claude 3.7 Sonnet
- Built with vanilla JavaScript, HTML, and CSS
