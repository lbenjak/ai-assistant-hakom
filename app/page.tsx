"use client";

import React from "react";
import styles from "./page.module.css";

const Home = () => {
  const categories = {
    "Virtualni asistent": "basic-chat",
    "Virtualni asistent s pretragom dokumenata": "file-search",
  };

  console.log(styles)

  return (
    <main className={styles.main}>
      <div className={styles.title} >
        Ako te zanima odgovor na neko opće pitanje izaberi Virtualnog asistenta,
        a ako te zanimaju pojedinosti o određenom ugovoru izaberi Virtualnog asistenta s pretragom dokumenata:
      </div>
      <div className={styles.container}>
        {Object.entries(categories).map(([name, url]) => (
          <a key={name} className={styles.category} href={`/examples/${url}`}>
            {name}
          </a>
        ))}
      </div>
    </main>
  );
};

export default Home;
