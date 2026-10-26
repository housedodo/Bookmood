import { Link } from 'react-router-dom';

export default function LibraryPage() {
  return (
    <main className="page">
      <h1 className="page-title">My Shelf</h1>
      <p className="page-subtitle">all your lovely books, in one place</p>
      <div className="placeholder">
        <p className="placeholder-text">Your shelf is empty. Scan your first book! 📚</p>
        <Link to="/scan" className="btn">Scan a book</Link>
      </div>
    </main>
  );
}
