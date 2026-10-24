
import { useEffect, useState } from 'react';
import './App.css';

type Role = 'consumer' | 'dealer' | 'official';

type StockItem = {
  name: string;
  quantity: number;
};

type Shop = {
  id: string;
  name: string;
  village: string;
  distance: string;
  hours: string;
  crowd: string;
  stock: StockItem[];
};

type Token = {
  number: string;
  shopName: string;
  date: string;
  slot: string;
};

const initialShops: Shop[] = [
  {
    id: '001',
    name: 'Demo Fair Price Shop 001',
    village: 'Greenfield',
    distance: '0.8 km',
    hours: '9:00 AM – 5:00 PM',
    crowd: 'Low',
    stock: [
      { name: 'Rice', quantity: 180 },
      { name: 'Wheat', quantity: 65 },
      { name: 'Sugar', quantity: 8 },
      { name: 'Toor dal', quantity: 0 },
    ],
  },
  {
    id: '002',
    name: 'Demo Fair Price Shop 002',
    village: 'Lakeview',
    distance: '1.5 km',
    hours: '9:00 AM – 5:00 PM',
    crowd: 'Medium',
    stock: [
      { name: 'Rice', quantity: 120 },
      { name: 'Wheat', quantity: 40 },
      { name: 'Sugar', quantity: 35 },
      { name: 'Toor dal', quantity: 12 },
    ],
  },
  {
    id: '003',
    name: 'Demo Fair Price Shop 003',
    village: 'Hillview',
    distance: '2.1 km',
    hours: '9:00 AM – 4:30 PM',
    crowd: 'High',
    stock: [
      { name: 'Rice', quantity: 0 },
      { name: 'Wheat', quantity: 24 },
      { name: 'Sugar', quantity: 20 },
      { name: 'Toor dal', quantity: 18 },
    ],
  },
  {
    id: '004',
    name: 'Demo Fair Price Shop 004',
    village: 'Riverside',
    distance: '2.8 km',
    hours: '9:00 AM – 5:00 PM',
    crowd: 'Low',
    stock: [
      { name: 'Rice', quantity: 90 },
      { name: 'Wheat', quantity: 55 },
      { name: 'Sugar', quantity: 0 },
      { name: 'Toor dal', quantity: 22 },
    ],
  },
];

function getStockStatus(quantity: number) {
  if (quantity === 0) return 'Out of stock';
  if (quantity < 20) return 'Low stock';
  return 'In stock';
}

function App() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [search, setSearch] = useState('');

  // Load saved stock from this browser.
  const [shops, setShops] = useState<Shop[]>(() => {
    try {
      const saved = localStorage.getItem('ration-shops');
      return saved ? (JSON.parse(saved) as Shop[]) : initialShops;
    } catch {
      return initialShops;
    }
  });

  // Save stock changes automatically.
  useEffect(() => {
    localStorage.setItem('ration-shops', JSON.stringify(shops));
  }, [shops]);

  const [activeToken, setActiveToken] = useState<Token | null>(() => {
    try {
      const saved = localStorage.getItem('ration-active-token');
      return saved ? (JSON.parse(saved) as Token) : null;
    } catch {
      return null;
    }
  });

  const [showBooking, setShowBooking] = useState(false);
  const [bookingShop, setBookingShop] = useState('001');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSlot, setBookingSlot] = useState('9:00 AM – 11:00 AM');
  const [bookingMessage, setBookingMessage] = useState('');
  const [notifications, setNotifications] = useState<string[]>([]);
  const [language, setLanguage] = useState<'English' | 'தமிழ்'>('English');

  const today = new Date().toLocaleDateString('en-CA');

  const pageStyle: React.CSSProperties = {
    maxWidth: 1100,
    margin: '0 auto',
    padding: 24,
    boxSizing: 'border-box',
  };

  const cardStyle: React.CSSProperties = {
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 20,
    background: '#ffffff',
    boxShadow: '0 3px 12px rgba(0,0,0,0.04)',
  };

  const buttonStyle: React.CSSProperties = {
    border: 'none',
    borderRadius: 8,
    padding: '10px 16px',
    background: '#176b45',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: 600,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: 10,
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 12,
  };

  function sendDemoOtp() {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setLoginMessage('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setOtpSent(true);
    setLoginMessage('Demo OTP sent. Use 123456 to log in.');
  }

  function verifyOtp() {
    if (otp === '123456') {
      setLoggedIn(true);
      setLoginMessage('');
    } else {
      setLoginMessage('Incorrect OTP. Enter 123456 for this demo.');
    }
  }

  function logout() {
    setLoggedIn(false);
    setSelectedRole(null);
    setMobile('');
    setOtp('');
    setOtpSent(false);
    setLoginMessage('');
    setSearch('');
  }

  function updateStock(shopId: string, itemName: string, value: string) {
    if (value.trim() === '') return;

    const quantity = Number(value);

    if (!Number.isFinite(quantity) || quantity < 0) return;

    setShops((current) =>
      current.map((shop) =>
        shop.id === shopId
          ? {
              ...shop,
              stock: shop.stock.map((item) =>
                item.name === itemName
                  ? { ...item, quantity: Math.floor(quantity) }
                  : item,
              ),
            }
          : shop,
      ),
    );
  }

  function bookToken() {
    if (!bookingDate || bookingDate < today) {
      setBookingMessage('Please choose today or a future date.');
      return;
    }

    const shop = shops.find((item) => item.id === bookingShop);

    if (!shop) {
      setBookingMessage('Please select a valid shop.');
      return;
    }

    const token: Token = {
      number: `SR-${Math.floor(1000 + Math.random() * 9000)}`,
      shopName: shop.name,
      date: bookingDate,
      slot: bookingSlot,
    };

    setActiveToken(token);
    localStorage.setItem('ration-active-token', JSON.stringify(token));
    setBookingMessage('Token booked successfully!');
    setShowBooking(false);
  }

  function notifyWhenAvailable(shop: Shop) {
    const unavailable = shop.stock.filter((item) => item.quantity === 0);
    const messages = unavailable.map(
      (item) => `Notification requested for ${item.name} at ${shop.name}.`,
    );

    setNotifications((current) => [
      ...current,
      ...messages.filter((message) => !current.includes(message)),
    ]);
  }

  const filteredShops = shops.filter((shop) => {
    const text = search.toLowerCase();
    return (
      shop.name.toLowerCase().includes(text) ||
      shop.village.toLowerCase().includes(text)
    );
  });

  // DEALER DASHBOARD
  if (loggedIn && selectedRole === 'dealer') {
    return (
      <main style={pageStyle}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1>RATION DEALER DASHBOARD</h1>
            <p>Welcome, Ration Dealer!</p>
            <p>Manage your shop stock and monitor ration distribution.</p>
          </div>
          <button style={buttonStyle} onClick={logout}>Log out</button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20, marginTop: 24 }}>
          {shops.map((shop) => (
            <section key={shop.id} style={cardStyle}>
              <h2>{shop.name}</h2>
              <p>{shop.village}</p>
              <h3>Available stock</h3>

              {shop.stock.map((item) => {
                const status = getStockStatus(item.quantity);
                return (
                  <div key={item.name} style={{ padding: '12px 0', borderTop: '1px solid #e2e8f0' }}>
                    <label>{item.name}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <input
                        aria-label={`${shop.name} ${item.name} quantity`}
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(event) => updateStock(shop.id, item.name, event.target.value)}
                        style={{ ...inputStyle, width: 110, margin: 0 }}
                      />
                      <span>kg</span>
                    </div>
                    <p style={{
                      color: status === 'In stock' ? '#15803d' : status === 'Low stock' ? '#b45309' : '#b91c1c',
                      marginBottom: 0,
                    }}>
                      {status}
                    </p>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 24 }}>
          Stock changes are saved in this browser. Demo data only. Not an official government service.
        </p>
      </main>
    );
  }

  // GOVERNMENT OFFICIAL DASHBOARD
  if (loggedIn && selectedRole === 'official') {
    const totalStock = shops.reduce(
      (total, shop) =>
        total + shop.stock.reduce((sum, item) => sum + item.quantity, 0),
      0,
    );

    const lowStockItems = shops.reduce(
      (total, shop) =>
        total + shop.stock.filter((item) => item.quantity > 0 && item.quantity < 20).length,
      0,
    );

    const outOfStockItems = shops.reduce(
      (total, shop) =>
        total + shop.stock.filter((item) => item.quantity === 0).length,
      0,
    );

    return (
      <main style={pageStyle}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1>GOVERNMENT OFFICIAL DASHBOARD</h1>
            <p>Overview of stock across all demo ration shops.</p>
          </div>
          <button style={buttonStyle} onClick={logout}>Log out</button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginTop: 20 }}>
          <section style={cardStyle}>
            <h3>Total shops</h3>
            <h2>{shops.length}</h2>
          </section>
          <section style={cardStyle}>
            <h3>Total stock</h3>
            <h2>{totalStock} kg</h2>
          </section>
          <section style={cardStyle}>
            <h3>Low-stock items</h3>
            <h2>{lowStockItems}</h2>
          </section>
          <section style={cardStyle}>
            <h3>Out-of-stock items</h3>
            <h2>{outOfStockItems}</h2>
          </section>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20, marginTop: 24 }}>
          {shops.map((shop) => (
            <section key={shop.id} style={cardStyle}>
              <h2>{shop.name}</h2>
              <p>{shop.village}</p>
              <ul>
                {shop.stock.map((item) => (
                  <li key={item.name}>
                    {item.name}: {item.quantity} kg — {getStockStatus(item.quantity)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 24 }}>
          Demo data only. Not an official government service.
        </p>
      </main>
    );
  }

  // CONSUMER DASHBOARD
  if (loggedIn && selectedRole === 'consumer') {
    return (
      <main style={pageStyle}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1>Consumer Dashboard</h1>
            <p>Find ration shops, check stock, and book a token.</p>
          </div>
          <button style={buttonStyle} onClick={logout}>Log out</button>
        </header>

        {activeToken && (
          <section style={{ ...cardStyle, marginTop: 20, background: '#f0fdf4' }}>
            <h2>Your active token</h2>
            <h1 style={{ color: '#166534' }}>{activeToken.number}</h1>
            <p><strong>Shop:</strong> {activeToken.shopName}</p>
            <p><strong>Date:</strong> {activeToken.date}</p>
            <p><strong>Time slot:</strong> {activeToken.slot}</p>
          </section>
        )}

        <section style={{ ...cardStyle, marginTop: 20 }}>
          <h2>Find a ration shop</h2>
          <input
            style={inputStyle}
            placeholder="Search by shop name or village..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20, marginTop: 20 }}>
          {filteredShops.map((shop) => (
            <section key={shop.id} style={cardStyle}>
              <h2>{shop.name}</h2>
              <p>{shop.village} · {shop.distance}</p>
              <p><strong>Opening hours:</strong> {shop.hours}</p>
              <p><strong>Crowd level:</strong> {shop.crowd}</p>
              <h3>Available stock</h3>

              {shop.stock.map((item) => (
                <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderTop: '1px solid #e2e8f0' }}>
                  <span>{item.name}</span>
                  <span style={{ textAlign: 'right' }}>
                    <strong>{item.quantity} kg</strong>
                    <br />
                    <small>{getStockStatus(item.quantity)}</small>
                  </span>
                </div>
              ))}

              <button style={{ ...buttonStyle, width: '100%', marginTop: 12 }} onClick={() => {
                setBookingShop(shop.id);
                setBookingDate('');
                setBookingMessage('');
                setShowBooking(true);
              }}>
                Book a token
              </button>

              {shop.stock.some((item) => item.quantity === 0) && (
                <button style={{ ...buttonStyle, width: '100%', marginTop: 8, background: '#475569' }} onClick={() => notifyWhenAvailable(shop)}>
                  Notify me when stock is available
                </button>
              )}
            </section>
          ))}
        </div>

        {showBooking && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16, zIndex: 1000 }}>
            <section style={{ ...cardStyle, width: '100%', maxWidth: 430 }}>
              <h2>Book a ration token</h2>

              <label htmlFor="booking-shop">Select shop</label>
              <select id="booking-shop" style={inputStyle} value={bookingShop} onChange={(event) => setBookingShop(event.target.value)}>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>{shop.name} — {shop.village}</option>
                ))}
              </select>

              <label htmlFor="booking-date">Select date</label>
              <input id="booking-date" type="date" min={today} style={inputStyle} value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} />

              <label htmlFor="booking-slot">Select time slot</label>
              <select id="booking-slot" style={inputStyle} value={bookingSlot} onChange={(event) => setBookingSlot(event.target.value)}>
                <option>9:00 AM – 11:00 AM</option>
                <option>11:00 AM – 1:00 PM</option>
                <option>1:00 PM – 3:00 PM</option>
                <option>3:00 PM – 5:00 PM</option>
              </select>

              {bookingMessage && <p style={{ color: '#b91c1c' }}>{bookingMessage}</p>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ ...buttonStyle, flex: 1 }} onClick={bookToken}>Confirm booking</button>
                <button style={{ ...buttonStyle, flex: 1, background: '#64748b' }} onClick={() => {
                  setShowBooking(false);
                  setBookingMessage('');
                }}>Cancel</button>
              </div>
            </section>
          </div>
        )}

        <section style={{ ...cardStyle, marginTop: 20 }}>
          <h2>Notifications</h2>
          {notifications.length === 0 ? (
            <p>No notifications yet.</p>
          ) : (
            <ul>{notifications.map((message, index) => <li key={`${message}-${index}`}>{message}</li>)}</ul>
          )}
        </section>

        <p style={{ color: '#64748b', fontSize: 13, marginTop: 24 }}>
          Demo data only. Not an official government service.
        </p>
      </main>
    );
  }

  // HOMEPAGE AND DEMO LOGIN
  return (
    <main style={pageStyle}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ color: '#176b45' }}>Smart Ration Queue</h2>
        <select aria-label="Select language" value={language} onChange={(event) => setLanguage(event.target.value as 'English' | 'தமிழ்')} style={{ ...inputStyle, width: 130, margin: 0 }}>
          <option value="English">English</option>
          <option value="தமிழ்">தமிழ்</option>
        </select>
      </header>

      <section style={{ padding: '50px 0 35px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(30px, 5vw, 48px)' }}>
          {language === 'தமிழ்' ? 'ஸ்மார்ட் ரேஷன் வரிசை' : 'Smart Ration Queue and Stock Management'}
        </h1>
        <p style={{ color: '#64748b', fontSize: 18 }}>
          {language === 'தமிழ்'
            ? 'வரிசையில் காத்திருக்கும் நேரத்தைக் குறைத்து, இருப்பை அறியுங்கள்.'
            : 'Check ration stock, reduce waiting time, and plan your visit.'}
        </p>
      </section>

      {!selectedRole ? (
        <section>
          <h2 style={{ textAlign: 'center' }}>Choose your role</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginTop: 24 }}>
            {([
              { role: 'consumer', title: 'Consumer', description: 'Check stock and book a ration token.' },
              { role: 'dealer', title: 'Ration Dealer', description: 'Manage shop stock and availability.' },
              { role: 'official', title: 'Government Official', description: 'Monitor stock across demo shops.' },
            ] as const).map((item) => (
              <button key={item.role} onClick={() => {
                setSelectedRole(item.role);
                setLoginMessage('');
              }} style={{ ...cardStyle, textAlign: 'left', cursor: 'pointer', color: '#0f172a' }}>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                <strong style={{ color: '#176b45' }}>Continue →</strong>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section style={{ ...cardStyle, maxWidth: 440, margin: '0 auto' }}>
          <h2>
            {selectedRole === 'consumer' ? 'Consumer Login' : selectedRole === 'dealer' ? 'Ration Dealer Login' : 'Government Official Login'}
          </h2>
          <p style={{ color: '#64748b' }}>Enter your mobile number to continue with demo login.</p>

          <label htmlFor="mobile">Mobile number</label>
          <input id="mobile" style={inputStyle} type="tel" maxLength={10} placeholder="10-digit mobile number" value={mobile} onChange={(event) => setMobile(event.target.value.replace(/\D/g, '').slice(0, 10))} />

          {!otpSent ? (
            <button style={{ ...buttonStyle, width: '100%' }} onClick={sendDemoOtp}>Send Demo OTP</button>
          ) : (
            <>
              <label htmlFor="otp">Demo OTP</label>
              <input id="otp" style={inputStyle} type="text" inputMode="numeric" maxLength={6} placeholder="Enter 123456" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} />
              <button style={{ ...buttonStyle, width: '100%' }} onClick={verifyOtp}>Verify OTP</button>
            </>
          )}

          {loginMessage && <p style={{ color: '#b91c1c', marginTop: 12 }}>{loginMessage}</p>}

          <button style={{ ...buttonStyle, background: '#64748b', width: '100%', marginTop: 12 }} onClick={() => {
            setSelectedRole(null);
            setMobile('');
            setOtp('');
            setOtpSent(false);
            setLoginMessage('');
          }}>Back</button>

          <p style={{ color: '#64748b', fontSize: 12, marginTop: 16 }}>
            Demo only: no real SMS is sent. Use OTP 123456.
          </p>
        </section>
      )}

      <footer style={{ textAlign: 'center', marginTop: 48, padding: '20px 0', color: '#64748b', borderTop: '1px solid #e2e8f0', fontSize: 13 }}>
        Demo data only. Not an official government service.
      </footer>
    </main>
  );
}

export default App;
