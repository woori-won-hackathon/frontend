export function AnalysisScreen() {
  return <main className="analysis-screen" aria-busy="true">
    <div className="analysis-emblem" aria-hidden="true"><span/><span/></div>
    <div role="status" aria-live="polite">
      <h1>어떤 상담이 필요한지<br/>확인하고 있어요.</h1>
      <div className="analysis-dots" aria-hidden="true"><i/><i/><i/></div>
      <p>문의 내용을 바탕으로<br/>적합한 상담 방법을 확인해요.</p>
    </div>
  </main>
}
