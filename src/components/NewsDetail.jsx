import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './NewsDetail.css';

export function NewsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await axios.get(`http://localhost:3001/api/content/${id}`);
        setContent(res.data);
      } catch (e) {
        setError('No se encontró la noticia');
      }
    };
    fetchContent();
  }, [id]);

  if (error) {
    return (
      <div className="news-detail">
        <p className="error">{error}</p>
        <button onClick={() => navigate(-1)}>Volver</button>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="news-detail">
        <p>Cargando noticia...</p>
      </div>
    );
  }

  return (
    <div className="news-detail">
      <button className="back-btn" onClick={() => navigate(-1)}>&larr; Volver</button>
      <h1>{content.title}</h1>
      <div className="date">
        {new Date(content.createdAt).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>
      <p className="description">{content.description}</p>
      {content.file && (
        <div className="file-info">
          <a href={`http://localhost:3001${content.file}`} target="_blank" rel="noopener noreferrer">
            📎 {content.fileName}
          </a>
        </div>
      )}
    </div>
  );
}
