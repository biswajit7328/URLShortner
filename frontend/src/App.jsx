
import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000/api/";
const BASE_URL = "http://127.0.0.1:8000/api/";

function App() {
  const [statistics, setStatistics] = useState(null);
  const [urls, setUrls] = useState([]);

  const [originalUrl, setOriginalUrl] = useState("");
  const [createdUrl, setCreatedUrl] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("Dashboard");

  // Fetch dashboard statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await fetch(`${API}statistics/`);
      if (!response.ok) throw new Error("Could not load statistics.");

      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error("Statistics Error:", error);
    }
  }, []);

  // Fetch URLs with pagination or search
  const fetchUrls = useCallback(async (currentPage = 1, query = "") => {
    setTableLoading(true);

    try {
      const endpoint = query.trim()
        ? `${API}search/?q=${encodeURIComponent(query)}`
        : `${API}all/?page=${currentPage}`;

      const response = await fetch(endpoint);

      if (!response.ok) throw new Error("Could not load URLs.");

      const data = await response.json();

      const records = Array.isArray(data)
        ? data
        : data.results || [];

      setUrls(records);

      if (Array.isArray(data)) {
        setTotalCount(records.length);
        setTotalPages(1);
      } else if (data.results) {
        setTotalCount(data.count ?? records.length);
        setTotalPages(
          Math.max(1, Math.ceil((data.count ?? records.length) / 5))
        );
      } else {
        setTotalCount(records.length);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("URL Fetch Error:", error);
      setUrls([]);
    } finally {
      setTableLoading(false);
    }
  }, []);

  // Initial dashboard loading
  useEffect(() => {
    fetchStatistics();
    fetchUrls(1);
  }, [fetchStatistics, fetchUrls]);

  // Search with a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchUrls(1, search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search, fetchUrls]);

  // Refresh dashboard data after an operation
  const refreshDashboard = async () => {
    await Promise.all([
      fetchStatistics(),
      fetchUrls(page, search),
    ]);
  };

  // Show messages
  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  // Create short URL
  const handleCreateUrl = async (event) => {
    event.preventDefault();

    const cleanUrl = originalUrl.trim();

    if (!cleanUrl) {
      showMessage("Please enter a URL.", "error");
      return;
    }

    try {
      new URL(cleanUrl);
    } catch {
      showMessage("Please enter a valid URL.", "error");
      return;
    }

    setLoading(true);
    setCreatedUrl(null);
    setMessage("");

    try {
      const response = await fetch(`${API}shorten/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          original_url: cleanUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorText =
          data.error ||
          data.original_url?.[0] ||
          data.detail ||
          "Unable to create short URL.";

        showMessage(errorText, "error");
        return;
      }

      setCreatedUrl(data);
      setOriginalUrl("");
      showMessage("Your short URL was created successfully!");

      await fetchStatistics();
      setSearch("");
      setPage(1);
      await fetchUrls(1, "");
    } catch (error) {
      console.error("Create URL Error:", error);
      showMessage("Unable to connect to Django backend.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Generate the short URL
  const getShortUrl = (shortCode) => {
    return `${BASE_URL}${shortCode}/`;
  };

  // Copy text to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showMessage("Copied to clipboard!");
    } catch {
      showMessage("Could not copy. Please copy the URL manually.", "error");
    }
  };

  // Update URL status
  const handleStatusChange = async (shortCode, isActive) => {
    try {
      const response = await fetch(
        `${API}status/${encodeURIComponent(shortCode)}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: isActive,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showMessage(data.error || "Unable to update status.", "error");
        return;
      }

      showMessage("URL status updated successfully.");
      await refreshDashboard();
    } catch (error) {
      console.error("Status Error:", error);
      showMessage("Unable to update URL status.", "error");
    }
  };

  // Delete / deactivate URL
  const handleDelete = async (shortCode) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${shortCode}"?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API}delete/${encodeURIComponent(shortCode)}/`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        showMessage(data.error || "Unable to deactivate URL.", "error");
        return;
      }

      showMessage("URL deactivated successfully.");
      await refreshDashboard();
    } catch (error) {
      console.error("Delete Error:", error);
      showMessage("Unable to deactivate URL.", "error");
    }
  };

  // Reactivate URL
  const handleReactivate = async (shortCode) => {
    try {
      const response = await fetch(
        `${API}reactivate/${encodeURIComponent(shortCode)}/`,
        {
          method: "PATCH",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        showMessage(data.error || "Unable to reactivate URL.", "error");
        return;
      }

      showMessage("URL reactivated successfully.");
      await refreshDashboard();
    } catch (error) {
      console.error("Reactivate Error:", error);
      showMessage("Unable to reactivate URL.", "error");
    }
  };

  // Edit original URL
  const handleEdit = async (url) => {
    const newUrl = window.prompt(
      "Enter the new destination URL:",
      url.original_url
    );

    if (newUrl === null) return;

    const cleanUrl = newUrl.trim();

    if (!cleanUrl) {
      showMessage("URL cannot be empty.", "error");
      return;
    }

    try {
      new URL(cleanUrl);
    } catch {
      showMessage("Please enter a valid URL.", "error");
      return;
    }

    try {
      const response = await fetch(
        `${API}update/${encodeURIComponent(url.short_code)}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            original_url: cleanUrl,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showMessage(
          data.error || data.original_url?.[0] || "Unable to update URL.",
          "error"
        );
        return;
      }

      showMessage("Destination URL updated successfully.");
      await fetchUrls(page, search);
    } catch (error) {
      console.error("Edit Error:", error);
      showMessage("Unable to update URL.", "error");
    }
  };

  // Pagination
  const changePage = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;

    setPage(newPage);
    fetchUrls(newPage, "");
  };

  // Chart data
  const chartData = useMemo(() => {
    const items = statistics?.clicks_per_url || [];

    return [...items]
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 7);
  }, [statistics]);

  const maxClicks = Math.max(
    1,
    ...chartData.map((item) => item.clicks)
  );

  const navItems = [
    { name: "Dashboard", icon: "⌂" },
    { name: "My Links", icon: "↗" },
    { name: "Analytics", icon: "▥" },
    { name: "Create Link", icon: "+" },
    { name: "Settings", icon: "⚙" },
  ];

  const navigateTo = (name) => {
    setActiveSection(name);

    const ids = {
      Dashboard: "dashboard",
      "My Links": "my-links",
      Analytics: "analytics",
      "Create Link": "create-link",
      Settings: "settings",
    };

    document.getElementById(ids[name])?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="app">

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <h2>Biswajit's URLShortner</h2>
        </div>

        <p className="menu-label">MENU</p>

        <nav>
          {navItems.map((item) => (
            <button
              key={item.name}
              className={`nav-link ${
                activeSection === item.name ? "active" : ""
              }`}
              onClick={() => navigateTo(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <div className="help-icon">?</div>
            <div>
              
              <strong>Need help?</strong>
              <p>Manage your links easily.</p>
            </div>
          </div>
          <p className="sidebar-version">SHORTIFY · URL MANAGER</p>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content" id="dashboard">

        {/* Topbar */}
        <header className="topbar">
          <div>
            <p className="breadcrumb">Pages / Dashboard</p>
            <h2>Dashboard</h2>
          </div>

          <div className="topbar-right">
            <div className="online-indicator">
              <span></span> Backend connected
            </div>
            <div className="avatar">B</div>
          </div>
        </header>

        {/* Welcome */}
        <section className="welcome">
          <div>
            <h1>Welcome back Akash 👋</h1>
            <p>Here's what's happening with your shortened links today.</p>
          </div>
          <div className="welcome-date">URL Management Dashboard</div>
        </section>

        {/* Messages */}
        {message && (
          <div className={`message ${messageType}`}>
            <span>{message}</span>
            <button onClick={() => setMessage("")}>×</button>
          </div>
        )}

        {/* Statistics */}
        <section className="stats">
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon purple">↗</div>
              <span className="stat-caption">All time</span>
            </div>
            <p>Total Links</p>
            <h2>{statistics?.total_urls ?? 0}</h2>
            <span className="stat-description">Links created</span>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon blue">◉</div>
              <span className="stat-caption">All time</span>
            </div>
            <p>Total Clicks</p>
            <h2>{statistics?.total_clicks ?? 0}</h2>
            <span className="stat-description">Total link visits</span>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon green">✓</div>
              <span className="stat-caption">Currently</span>
            </div>
            <p>Active Links</p>
            <h2>{statistics?.active_urls ?? 0}</h2>
            <span className="stat-description">Available links</span>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon orange">⊘</div>
              <span className="stat-caption">Currently</span>
            </div>
            <p>Inactive Links</p>
            <h2>{statistics?.inactive_urls ?? 0}</h2>
            <span className="stat-description">Disabled links</span>
          </div>
        </section>

        {/* Analytics and Create Link */}
        <section className="dashboard-grid">

          {/* Analytics Chart */}
          <div className="content-card analytics-card" id="analytics">
            <div className="card-heading">
              <div>
                <h2>Click Analytics</h2>
                <p>Most clicked shortened URLs</p>
              </div>
              <span className="chart-badge">Top 7 links</span>
            </div>

            {chartData.length > 0 ? (
              <div className="chart">
                {chartData.map((item, index) => (
                  <div className="chart-row" key={item.short_code}>
                    <div className="chart-label">
                      <span>{item.short_code}</span>
                      <strong>{item.clicks} clicks</strong>
                    </div>
                    <div className="bar-background">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${(item.clicks / maxClicks) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-chart">
                <div className="empty-chart-icon">▥</div>
                <p>No click data available yet.</p>
                <span>Your analytics will appear here.</span>
              </div>
            )}
          </div>

          {/* Create Link */}
          <div className="content-card create-card" id="create-link">
            <div className="card-heading">
              <div>
                <h2>Create New Link</h2>
                <p>Shorten your long URL instantly.</p>
              </div>
              <div className="create-icon">↗</div>
            </div>

            <form onSubmit={handleCreateUrl}>
              <label htmlFor="originalUrl">Destination URL</label>
              <input
                id="originalUrl"
                type="url"
                placeholder="https://example.com/your-long-url"
                value={originalUrl}
                onChange={(event) => setOriginalUrl(event.target.value)}
                required
              />

              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? "Creating..." : "+ Create Short Link"}
              </button>
            </form>

            {createdUrl && (
              <div className="created-result">
                <p>Your short URL is ready!</p>
                <div className="created-url-row">
                  <a
                    href={getShortUrl(createdUrl.short_code)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {getShortUrl(createdUrl.short_code)}
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(getShortUrl(createdUrl.short_code))
                    }
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* My Links */}
        <section className="links-section" id="my-links">
          <div className="links-header">
            <div>
              <h2>My Links</h2>
              <p>View, search and manage your shortened URLs.</p>
            </div>

            <div className="total-links">
              {totalCount} Total Links
            </div>
          </div>

          <div className="table-toolbar">
            <div className="search-box">
              <span>⌕</span>
              <input
                type="search"
                placeholder="Search original URL or short code..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <button
              className="refresh-button"
              onClick={refreshDashboard}
              type="button"
            >
              ↻ Refresh
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Destination URL</th>
                  <th>Short URL</th>
                  <th>Clicks</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan="6" className="no-data">
                      Loading URLs...
                    </td>
                  </tr>
                ) : urls.length > 0 ? (
                  urls.map((url) => (
                    <tr key={url.id}>
                      <td className="original-url">
                        <a
                          href={url.original_url}
                          target="_blank"
                          rel="noreferrer"
                          title={url.original_url}
                        >
                          {url.original_url}
                        </a>
                      </td>

                      <td className="short-code-cell">
                        <a
                          href={getShortUrl(url.short_code)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {url.short_code}
                        </a>
                      </td>

                      <td>
                        <strong>{url.clicks}</strong>
                      </td>

                      <td>
                        <span
                          className={`status ${
                            url.is_active
                              ? "active-status"
                              : "inactive-status"
                          }`}
                        >
                          {url.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td>
                        {new Date(url.created_at).toLocaleDateString()}
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-button copy-action"
                            title="Copy short URL"
                            onClick={() =>
                              copyToClipboard(getShortUrl(url.short_code))
                            }
                          >
                            Copy
                          </button>

                          <button
                            className="action-button edit-action"
                            title="Edit destination"
                            onClick={() => handleEdit(url)}
                          >
                            Edit
                          </button>

                          {url.is_active ? (
                            <>
                              <button
                                className="action-button disable-action"
                                title="Deactivate URL"
                                onClick={() =>
                                  handleStatusChange(url.short_code, false)
                                }
                              >
                                Disable
                              </button>

                              <button
                                className="action-button delete-action"
                                title="Delete URL"
                                onClick={() => handleDelete(url.short_code)}
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <button
                              className="action-button reactivate-action"
                              onClick={() =>
                                handleReactivate(url.short_code)
                              }
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="no-data">
                      {search
                        ? "No matching URLs found."
                        : "No shortened URLs found. Create your first link above."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!search && (
            <div className="pagination">
              <span>
                Showing {urls.length} of {totalCount} links
              </span>

              <div className="pagination-buttons">
                <button
                  disabled={page <= 1}
                  onClick={() => changePage(page - 1)}
                >
                  Previous
                </button>

                <span>
                  Page {page} of {totalPages}
                </span>

                <button
                  disabled={page >= totalPages}
                  onClick={() => changePage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Settings anchor */}
        <section id="settings" className="settings-footer">
          <a
  href="https://wa.me/917328868893"
  target="_blank"
  rel="noreferrer"
  className="settings-contact-link whatsapp-link"
  title="Contact on WhatsApp"
>
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M16 3a12.9 12.9 0 0 0-11 19.6L3.3 29l6.6-1.7A13 13 0 1 0 16 3Zm0 23.5a10.5 10.5 0 0 1-5.3-1.4l-.4-.2-3.9 1 1-3.8-.3-.4A10.5 10.5 0 1 1 16 26.5Zm5.8-7.9c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6l-.9-2.1c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.6s1.1 3 1.2 3.2c.2.2 2.2 3.4 5.3 4.7 2.6 1 3.2.8 3.8.8.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.4Z"/>
  </svg>
  <span>+91 7328868893</span>
</a>

<a
  href="mailto:biswajit7328@gmail.com"
  className="settings-contact-link email-link"
  title="Send Email"
>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm9 8L3 7v10h18V7l-9 6Zm0-2 8-4H4l8 4Z"/>
  </svg>
  <span>biswajit7328@gmail.com</span>
</a>
        </section>

        <footer className="footer">
          Biswajit Behera | Built with Python,Django and React
        </footer>
      </main>
    </div>
  );
}

export default App;
