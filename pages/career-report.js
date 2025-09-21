// pages/career-report.js
import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

/**
 * Simple, single-default-export page that reads the report saved in sessionStorage
 * by the career-counseling page and displays it. Safe for Next dev server.
 */

export default function CareerReportPage() {
  const router = useRouter();
  const [reportMd, setReportMd] = useState(null);
  const [name, setName] = useState("");

  useEffect(() => {
    try {
      const r = sessionStorage.getItem("prepmate_career_report");
      const n = sessionStorage.getItem("prepmate_career_name") || "";
      setReportMd(r || null);
      setName(n);
    } catch (e) {
      console.warn("sessionStorage read failed", e);
    }
  }, []);

  function handleBack() {
    router.push("/career-counseling");
  }

  if (reportMd === null) {
    return (
      <>
        <Head><title>Career Report — PrepMate</title></Head>
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#071018",color:"#e6fff9"}}>
          <div style={{textAlign:"center"}}>
            <div style={{marginBottom:12,fontSize:18}}>No report found</div>
            <div style={{color:"#99b3ad"}}>Please run the Career Counseling form first.</div>
            <div style={{marginTop:18}}>
              <button onClick={handleBack} style={{padding:"10px 14px",borderRadius:8,border:"none",background:"#40E0D0",color:"#012524",fontWeight:700,cursor:"pointer"}}>Open Counseling Form</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // reportMd expected to be a markdown/plain text string returned by your API
  return (
    <>
      <Head><title>Career Report — PrepMate</title></Head>

      <div style={{minHeight:"100vh",background:"#071018",color:"#e6fff9",paddingBottom:60}}>
        <header style={{padding:"18px 16px",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
          <div style={{maxWidth:980,margin:"0 auto",display:"flex",alignItems:"center",gap:12}}>
            <img src="/prepmate-logo.png" alt="logo" style={{width:40}} />
            <h1 style={{margin:0,fontSize:18,color:"#40E0D0"}}>PrepMate — Career Report</h1>
          </div>
        </header>

        <main style={{maxWidth:980,margin:"28px auto",padding:"0 16px 60px"}}>
          <section style={{background:"#0f1720",padding:20,borderRadius:12,boxShadow:"0 8px 30px rgba(0,0,0,0.6)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
              <div>
                <h2 style={{margin:"0 0 8px 0"}}>Final Career Report</h2>
                <div style={{color:"#9fbdb4"}}>{name ? `For ${name}` : ""}</div>
              </div>
              <div>
                <button onClick={() => { sessionStorage.removeItem("prepmate_career_report"); sessionStorage.removeItem("prepmate_career_name"); router.push("/"); }} style={{padding:"8px 12px",borderRadius:8,border:"none",background:"#40E0D0",color:"#012524",fontWeight:700}}>Done</button>
              </div>
            </div>

            <div style={{marginTop:18,color:"#d6efe7",lineHeight:1.6,whiteSpace:"pre-wrap"}}>
              {reportMd}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
