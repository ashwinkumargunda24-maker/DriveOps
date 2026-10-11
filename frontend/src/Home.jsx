import { Link } from "react-router-dom"

function Home() {
  return (
    <main className="home-page">
      <section className="home-visual" aria-label="DriveOps fleet vehicle">
        <div className="home-brand"><span className="brand-mark">D</span><strong>drive<span>ops</span></strong></div>
        <div className="home-image-frame">
          <img src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1400&q=85" alt="DriveOps fleet truck on the road" />
          <div className="image-caption"><span>DRIVEOPS</span><b>Move what matters.</b></div>
        </div>
      </section>
      <section className="home-actions">
        <div className="home-actions-inner">
          <span className="eyebrow accent-eyebrow">Fleet intelligence platform</span>
          <h1>Every mile,<br /><em>in control.</em></h1>
          <div className="home-divider" />
          <div className="home-buttons">
            <Link className="home-primary-button" to="/log">Login <span>→</span></Link>
            <Link className="home-secondary-button" to="/reg">Sign up <span>↗</span></Link>
          </div>
        </div>
        <span className="home-footer">© 2026 DriveOps</span>
      </section>
    </main>
  )
}
export default Home