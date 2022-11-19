import React from "react";
import Layout from "@theme/Layout";

export default function IndexPage() {
  return (
    <Layout>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <main>
          <h1>Knub</h1>
          <p>
            Knub is a modern TypeScript framework for creating Discord bots, with a focus on great developer experience and safe defaults.
          </p>
          <p>
            <a href="/docs/31">Go to documentation</a>
          </p>
        </main>
      </div>
    </Layout>
  );
}
