import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@/styles/globals.css";
import "@/styles/animations.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);




// import React, { useEffect } from "react";
// import ReactDOM from "react-dom/client";
// import App from "./App";
// import "@/styles/globals.css";
// import "@/styles/animations.css";

// function Root() {
//   useEffect(() => {
//     const disableRightClick = (e) => e.preventDefault();
//     const disableKeys = (e) => {
//       if (
//         e.key === "F12" ||
//         (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
//         (e.ctrlKey && (e.key === "u" || e.key === "U"))
//       ) {
//         e.preventDefault();
//         return false;
//       }
//     };

//     document.addEventListener("contextmenu", disableRightClick);
//     document.addEventListener("keydown", disableKeys);

//     return () => {
//       document.removeEventListener("contextmenu", disableRightClick);
//       document.removeEventListener("keydown", disableKeys);
//     };
//   }, []);

//   return <App />;
// }

// ReactDOM.createRoot(document.getElementById("root")).render(
//   <React.StrictMode>
//     <Root />
//   </React.StrictMode>
// );
