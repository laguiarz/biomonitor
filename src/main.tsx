import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const rootStyles = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #F5F5F5;
    color: #212121;
  }
  #root {
    height: 100vh;
  }
`;

const style = document.createElement("style");
style.textContent = rootStyles;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
