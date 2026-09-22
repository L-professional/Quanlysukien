import re

def html_to_jsx(html_string):
    # Basic replacements
    jsx = html_string.replace('class="', 'className="')
    jsx = jsx.replace('for="', 'htmlFor="')
    
    # Self-closing tags
    for tag in ['img', 'input', 'br', 'hr']:
        jsx = re.sub(rf'<{tag}([^>]*?)(?<!/)>', rf'<{tag}\1 />', jsx)
        
    # Replace style="prop: value;" with style={{ prop: 'value' }}
    def style_replacer(match):
        style_str = match.group(1)
        styles = []
        for prop in style_str.split(';'):
            prop = prop.strip()
            if not prop:
                continue
            key, val = prop.split(':', 1)
            key = key.strip()
            val = val.strip()
            # camelCase the key
            parts = key.split('-')
            key = parts[0] + ''.join(p.capitalize() for p in parts[1:])
            styles.append(f"{key}: '{val}'")
        return 'style={{ ' + ', '.join(styles) + ' }}'
        
    jsx = re.sub(r'style="([^"]*)"', style_replacer, jsx)
    
    # Replace href="#" with valid React Router Links (for login/register)
    # We will do this manually in the React component after parsing.
    
    return jsx

with open('landing-page/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract body
body_match = re.search(r'<body[^>]*>(.*?)<script>', content, re.DOTALL)
if body_match:
    body_html = body_match.group(1)
    
    # Also extract styles from head
    style_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
    styles = style_match.group(1) if style_match else ''
    
    jsx = html_to_jsx(body_html)
    
    # Fix the specific Links
    jsx = jsx.replace('<a href="#" className="text-[14px] font-semibold text-event-text hover:text-event-red transition-colors flex items-center gap-2">',
                      '<Link to="/login" className="text-[14px] font-semibold text-event-text hover:text-event-red transition-colors flex items-center gap-2">')
    jsx = jsx.replace('Đăng nhập\n                </a>', 'Đăng nhập\n                </Link>')
    
    jsx = jsx.replace('<a href="#" className="btn-primary px-6 py-2.5 rounded-md text-[14px] font-semibold flex items-center gap-2">',
                      '<Link to="/login?mode=register" className="btn-primary px-6 py-2.5 rounded-md text-[14px] font-semibold flex items-center gap-2">')
    jsx = jsx.replace('Bắt đầu\n                </a>', 'Bắt đầu\n                </Link>')
    
    # Fix other a href="#" to just div or button to avoid React warnings if we want, or keep them
    jsx = jsx.replace('href="#"', 'href="#home"') # temporary fix for empty links
    
    react_code = f"""import React, {{ useEffect }} from 'react';
import {{ Link }} from 'react-router-dom';

const LandingPage: React.FC = () => {{
  useEffect(() => {{
    // Header scroll effect
    const header = document.getElementById('header');
    
    const handleScroll = () => {{
        if (header) {{
            if (window.scrollY > 20) {{
                header.classList.add('glass-header');
                header.classList.replace('border-transparent', 'border-event-border');
            }} else {{
                header.classList.remove('glass-header');
                header.classList.replace('border-event-border', 'border-transparent');
            }}
        }}
    }};
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    
    if (mobileMenuBtn && mobileMenu) {{
        mobileMenuBtn.addEventListener('click', () => {{
            mobileMenu.classList.toggle('hidden');
            const icon = mobileMenuBtn.querySelector('i');
            if(icon) {{
                if(mobileMenu.classList.contains('hidden')) {{
                    icon.classList.replace('ph-x', 'ph-list');
                }} else {{
                    icon.classList.replace('ph-list', 'ph-x');
                }}
            }}
        }});

        mobileLinks.forEach(link => {{
            link.addEventListener('click', () => {{
                mobileMenu.classList.add('hidden');
                const icon = mobileMenuBtn.querySelector('i');
                if(icon) icon.classList.replace('ph-x', 'ph-list');
            }});
        }});
    }}

    // Active Navigation Highlighting
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const handleNavScroll = () => {{
        let current = '';
        sections.forEach(section => {{
            const sectionTop = (section as HTMLElement).offsetTop;
            if (scrollY >= (sectionTop - 150)) {{
                current = section.getAttribute('id') || '';
            }}
        }});

        navLinks.forEach(link => {{
            link.classList.remove('active-nav');
            if (link.getAttribute('href')?.includes(current)) {{
                link.classList.add('active-nav');
            }}
        }});
    }};
    window.addEventListener('scroll', handleNavScroll);

    // Scroll Animation Observer (Fade up)
    const fadeElements = document.querySelectorAll('.fade-up');
    
    const observerOptions = {{
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    }};
    
    const observer = new IntersectionObserver((entries, observer) => {{
        entries.forEach(entry => {{
            if (entry.isIntersecting) {{
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }}
        }});
    }}, observerOptions);
    
    fadeElements.forEach(el => observer.observe(el));
    
    return () => {{
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('scroll', handleNavScroll);
    }};
  }}, []);

  return (
    <div className="landing-page-wrapper">
      <style>{{`{styles}`}}</style>
      {jsx}
    </div>
  );
}};

export default LandingPage;
"""
    with open('frontend/src/pages/LandingPage.tsx', 'w', encoding='utf-8') as out:
        out.write(react_code)
    print("Done")
