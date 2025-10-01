"use client";

import React from "react";
import styles from "./page.module.css";
import Chat from "./components/chat";

const Home = () => {
  return (
    <main className={styles.main}>
      <img 
        src="/HAKOM_logo_2.png" 
        alt="HAKOM Logo" 
        className="logo"
      />
      <div className={styles.container}>
        <Chat />
      </div>
    </main>
  );
};

export default Home;
