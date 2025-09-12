export default function Home() {
  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', flexDirection: 'column', gap: 12, padding: 20
    }}>
      <h1 style={{margin:0}}>Welcome to PrepLift — your preparation partner</h1>
      <div style={{
        width:180, height:180, borderRadius:18,
        border:'2px dashed #ccc',
        display:'flex', alignItems:'center', justifyContent:'center',
        marginTop:8
      }}>
        <span>Logo (placeholder)</span>
      </div>
      <button style={{padding:'10px 18px', marginTop:18, cursor:'pointer'}}>
        Get Started / Login
      </button>
    </div>
  )
}
