# Application Foundation - Starter Kit

This directory contains all the reusable base components, styles, hooks, and configurations needed to start a new web application with the same design system and UI foundation as the TimeTool project.

## How to Use

To start a new project:

1.  **Copy this directory's contents** to your new project's root folder.
2.  **Install Dependencies:** Ensure your new project's `package.json` includes the core dependencies listed in `package.json.sample`.
3.  **Configure `tsconfig.json`:** Make sure the `paths` alias in your `tsconfig.json` is set up correctly as shown in `tsconfig.json.sample`.
4.  **Start Building:** You can now build your application-specific pages and components on top of this solid foundation.

## Contents

-   `/src/components/ui`: All the reusable, headless UI components (Button, Card, Dialog, etc.).
-   `/src/lib`: Core utility functions like `cn`.
-   `/src/hooks`: Reusable React hooks like `use-mobile` and `use-toast`.
-   `/src/styles`: Contains `globals.css` which defines the application's visual theme (colors, fonts, etc.).
-   `/config`: Contains configuration files like `tailwind.config.ts` and `components.json`.
-   `package.json.sample`: A sample file listing the necessary npm dependencies.
-   `tsconfig.json.sample`: A sample file showing the required `paths` configuration.
