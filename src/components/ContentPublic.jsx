import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './ContentPublic.css';

export function ContentPublic() {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/content');
      setContents(response.data);
    } catch (err) {
      setError('Error al cargar el contenido');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="public-container">
        <div className="loading">Cargando contenido...</div>
      </div>
    );
  }

  return (
    <div className="public-container">
      <header className="public-header">
        <h1>Portal de informaciones</h1>
        <p>Últimas noticias e información agregadas</p>
      </header>

      <div className="public-content">
        {error && <p className="error">{error}</p>}

        {contents.length === 0 ? (
          <div className="no-content">
            <p>No hay contenido disponible en este momento.</p>
          </div>
        ) : (
          <div className="articles-grid">
            {contents
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 6)
              .map((content) => (
              <article key={content.id} className="article-card">
                <div className="article-date">
                  {new Date(content.createdAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <h2>{content.title}</h2>
                <p>{content.description}</p>
                {content.file && (
                  <div className="article-file">
                    <a 
                      href={`http://localhost:3001${content.file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="download-btn"
                    >
                      📥 Descargar: {content.fileName}
                    </a>
                  </div>
                )}
                <div className="read-more">
                  <Link to={`/news/${content.id}`}>Leer más →</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
