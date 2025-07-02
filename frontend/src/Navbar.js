import React from "react";
import "./Navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <img src="/loopify-logo.png" alt="Logo" className="navbar-logo" />
        <div>
          <div className="navbar-title">Loopify.AI</div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
