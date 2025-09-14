import Head from "next/head";
<link rel="icon" href="/prepmate-logo.png" />


function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>PrepMate — your preparation partner</title>
        <meta name="description" content="PrepMate: generate tests from study materials and get AI analysis." />
        <link rel="icon" href="/logo.png" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
export default MyApp;
