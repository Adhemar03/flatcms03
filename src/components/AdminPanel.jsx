import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminPanel.css';

export function AdminPanel() {
  const [contents, setContents] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importSuccess, setImportSuccess] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchContents();
  }, [token, navigate]);

  const fetchContents = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/content');
      setContents(response.data);
    } catch (err) {
      setError('Error al cargar contenido');
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      if (file) {
        formData.append('file', file);
      }

      if (editingId) {
        await axios.put(
          `http://localhost:3001/api/content/${editingId}`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      } else {
        await axios.post(
          'http://localhost:3001/api/content',
          formData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      }

      setTitle('');
      setDescription('');
      setFile(null);
      setEditingId(null);
      fetchContents();
    } catch (err) {
      setError('Error al guardar contenido');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro?')) return;

    try {
      await axios.delete(`http://localhost:3001/api/content/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchContents();
    } catch (err) {
      setError('Error al eliminar contenido');
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Panel de Administración</h1>
        <button onClick={handleLogout} className="logout-btn">Cerrar Sesión</button>
      </header>

      <div className="admin-content">
        <div className="form-section">
          <h2>{editingId ? 'Editar' : 'Crear'} Contenido</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Título</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título del contenido"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Descripción</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción del contenido"
                rows="5"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="file">Archivo (PDF, imagen, etc.)</label>
              <input
                id="file"
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </div>

            {error && <p className="error">{error}</p>}

            <div className="form-buttons">
              <button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setEditingId(null);
                    setTitle('');
                    setDescription('');
                    setFile(null);
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
          <div className="import-section">
            <h3>Importar JSON</h3>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setImportFile(e.target.files[0])}
            />
            <button
              disabled={!importFile}
              onClick={async () => {
                if (!importFile) return;
                const formData = new FormData();
                formData.append('jsonFile', importFile);
                try {
                  await axios.post('http://localhost:3001/api/content/import',
                    formData,
                    {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                      }
                    }
                  );
                  setImportFile(null);
                  fetchContents();
                  setImportSuccess('Importación completada');
                  setTimeout(() => setImportSuccess(''), 3000);
                } catch (err) {
                  const msg = err.response?.data?.error || 'Error al importar JSON';
                  setError(msg);
                  console.error('Import failed', err);
                }
              }}
            >
              Importar
            </button>
          </div>
          {importSuccess && <p className="success">{importSuccess}</p>}
        </div>

        <div className="content-section">
          <h2>Contenido Publicado ({contents.length})</h2>
          <div className="content-list">
            {contents.map((content) => (
              <div key={content.id} className="content-item">
                <div className="content-header">
                  <h3>{content.title}</h3>
                  <span className="date">
                    {new Date(content.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p>{content.description}</p>
                {content.file && (
                  <div className="file-info">
                    <a href={`http://localhost:3001${content.file}`} target="_blank" rel="noopener noreferrer">
                      📎 {content.fileName}
                    </a>
                  </div>
                )}
                <div className="content-actions">
                  <button
                    onClick={() => {
                      setEditingId(content.id);
                      setTitle(content.title);
                      setDescription(content.description);
                      window.scrollTo(0, 0);
                    }}
                    className="edit-btn"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(content.id)}
                    className="delete-btn"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
