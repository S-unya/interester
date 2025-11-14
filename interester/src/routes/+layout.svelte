<script lang="ts">
  import { page } from '$app/stores';
  
  const navItems = [
    { href: '/', label: 'Dashboard', icon: '🏠' },
    { href: '/interests', label: 'Interests', icon: '⭐' },
    { href: '/results', label: 'Results', icon: '📊' },
    { href: '/settings', label: 'Settings', icon: '⚙️' }
  ];
</script>

<div class="app-layout">
  <nav class="sidebar">
    <div class="logo">
      <h1>🔍 Interester</h1>
    </div>
    
    <ul class="nav-items">
      {#each navItems as item}
        <li>
          <a 
            href={item.href} 
            class:active={$page.url.pathname === item.href}
            aria-current={$page.url.pathname === item.href ? 'page' : undefined}
          >
            <span class="icon">{item.icon}</span>
            <span class="label">{item.label}</span>
          </a>
        </li>
      {/each}
    </ul>
  </nav>

  <main class="content">
    <slot />
  </main>
</div>

<style>
  .app-layout {
    display: flex;
    min-height: 100vh;
    background: #f5f5f5;
  }

  .sidebar {
    width: 240px;
    background: #ffffff;
    border-right: 1px solid #e0e0e0;
    padding: 1.5rem 0;
    display: flex;
    flex-direction: column;
  }

  .logo {
    padding: 0 1.5rem 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }

  .logo h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
    color: #333;
  }

  .nav-items {
    list-style: none;
    padding: 1rem 0;
    margin: 0;
  }

  .nav-items li {
    margin: 0;
  }

  .nav-items a {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    color: #666;
    text-decoration: none;
    transition: all 0.2s;
  }

  .nav-items a:hover {
    background: #f5f5f5;
    color: #333;
  }

  .nav-items a.active {
    background: #e3f2fd;
    color: #1976d2;
    border-right: 3px solid #1976d2;
  }

  .icon {
    font-size: 1.25rem;
  }

  .label {
    font-size: 0.95rem;
    font-weight: 500;
  }

  .content {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
  }

  @media (max-width: 768px) {
    .app-layout {
      flex-direction: column;
    }

    .sidebar {
      width: 100%;
      border-right: none;
      border-bottom: 1px solid #e0e0e0;
    }

    .nav-items {
      display: flex;
      overflow-x: auto;
    }

    .nav-items li {
      flex-shrink: 0;
    }

    .nav-items a {
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.75rem 1rem;
    }

    .label {
      font-size: 0.75rem;
    }
  }
</style>
