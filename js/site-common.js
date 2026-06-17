/**
 * site-common.js - Inteligencia Brasil
 * Replaces jQuery + Bootstrap JS + jQuery Easing
 * Vanilla JavaScript - Zero dependencies
 */
(function () {
    'use strict';

    // ========== 1. NAVBAR COLLAPSE TOGGLE ==========
    // Replaces Bootstrap collapse for navbar toggler
    document.addEventListener('click', function (e) {
        var toggler = e.target.closest('[data-toggle="collapse"]');
        if (!toggler) return;

        var targetSel = toggler.getAttribute('data-target') || toggler.getAttribute('href');
        var target = document.querySelector(targetSel);
        if (!target) return;

        var isShown = target.classList.contains('show');
        target.classList.toggle('show', !isShown);
        toggler.classList.toggle('collapsed', isShown);
        toggler.setAttribute('aria-expanded', String(!isShown));
    });

    // Close navbar on nav-link click (mobile UX)
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.navbar-nav .nav-link') || e.target.closest('.dropdown-toggle')) return;
        var openNav = document.querySelector('.navbar-collapse.show');
        if (!openNav) return;
        openNav.classList.remove('show');
        var tog = document.querySelector('.navbar-toggler');
        if (tog) {
            tog.classList.add('collapsed');
            tog.setAttribute('aria-expanded', 'false');
        }
    });

    // ========== 1b. DROPDOWN TOGGLE (mobile + keyboard) ==========
    // Click toggle for touch devices & keyboard accessibility
    document.addEventListener('click', function (e) {
        var toggle = e.target.closest('.dropdown-toggle');
        if (!toggle) {
            // Click outside: close all open dropdowns
            document.querySelectorAll('.navbar-custom .dropdown.show').forEach(function (d) {
                d.classList.remove('show');
                d.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
            });
            return;
        }
        e.preventDefault();
        var dropdown = toggle.closest('.dropdown');
        var isOpen = dropdown.classList.contains('show');

        // Close other open dropdowns
        document.querySelectorAll('.navbar-custom .dropdown.show').forEach(function (d) {
            d.classList.remove('show');
            d.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
        });

        // Toggle current
        if (!isOpen) {
            dropdown.classList.add('show');
            toggle.setAttribute('aria-expanded', 'true');
        }
    });

    // Keyboard navigation for dropdown
    document.addEventListener('keydown', function (e) {
        var dropdown = e.target.closest('.navbar-custom .dropdown');
        if (!dropdown) return;

        if (e.key === 'Escape') {
            dropdown.classList.remove('show');
            dropdown.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
            dropdown.querySelector('.dropdown-toggle').focus();
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            var items = dropdown.querySelectorAll('.dropdown-item');
            if (!items.length) return;
            var idx = Array.prototype.indexOf.call(items, document.activeElement);
            if (e.key === 'ArrowDown') idx = idx < items.length - 1 ? idx + 1 : 0;
            else idx = idx > 0 ? idx - 1 : items.length - 1;
            items[idx].focus();
        }

        if (e.key === 'Enter' && e.target.classList.contains('dropdown-toggle')) {
            e.preventDefault();
            var isOpen = dropdown.classList.contains('show');
            dropdown.classList.toggle('show', !isOpen);
            e.target.setAttribute('aria-expanded', String(!isOpen));
            if (!isOpen) {
                var first = dropdown.querySelector('.dropdown-item');
                if (first) first.focus();
            }
        }
    });

    // ========== 2. NAVBAR SCROLL EFFECT ==========
    var navbarCustom = document.querySelector('.navbar-custom');
    var scrollTicking = false;
    var lastScrollY = 0;
    function handleNavScroll() {
        navbarCustom.classList.toggle('top-nav-collapse', lastScrollY > 20);
        scrollTicking = false;
    }
    if (navbarCustom) {
        window.addEventListener('scroll', function () {
            lastScrollY = window.pageYOffset;
            if (!scrollTicking) {
                requestAnimationFrame(handleNavScroll);
                scrollTicking = true;
            }
        }, { passive: true });
        lastScrollY = window.pageYOffset;
        handleNavScroll();
    }

    // ========== 3. SMOOTH SCROLL ==========
    // Replaces jQuery animate + easing
    document.addEventListener('click', function (e) {
        var link = e.target.closest('a.page-scroll, a[href^="#"]');
        if (!link) return;
        var href = link.getAttribute('href');
        if (!href || href === '#' || href.indexOf('#') !== 0) return;
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: top, behavior: 'smooth' });
    });

    // ========== 4. BACK TO TOP ==========
    var backBtn = document.querySelector('.back-to-top');
    if (backBtn) {
        window.addEventListener('scroll', function () {
            backBtn.style.display = window.pageYOffset > 300 ? 'flex' : 'none';
        }, { passive: true });
        backBtn.addEventListener('click', function (e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ========== 5. FAQ ACCORDION ==========
    document.querySelectorAll('.faq-question').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var item = this.closest('.faq-item');
            var isActive = item.classList.contains('active');

            // Close all open items
            document.querySelectorAll('.faq-item.active').forEach(function (el) {
                el.classList.remove('active');
                var q = el.querySelector('.faq-question');
                if (q) q.setAttribute('aria-expanded', 'false');
            });

            // Toggle current
            if (!isActive) {
                item.classList.add('active');
                this.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // ========== 6. SPINNER FADEOUT ==========
    // Hide immediately when deferred script runs (after HTML parse, before DOMContentLoaded)
    // This improves LCP by revealing above-the-fold content as soon as DOM is ready
    var spinner = document.querySelector('.spinner-wrapper');
    if (spinner) {
        spinner.style.transition = 'opacity 0.3s';
        spinner.style.opacity = '0';
        setTimeout(function () { if (spinner) spinner.style.display = 'none'; }, 300);
    }

    // ========== 7. FADE-IN ON SCROLL ==========
    if ('IntersectionObserver' in window) {
        var fadeObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.fade-in').forEach(function (el) {
            fadeObserver.observe(el);
        });
    }

    // ========== 8. IMAGE LIGHTBOX (article hero images) ==========
    // Allows readers to tap dense infographic images and view them at full size
    var heroFigures = document.querySelectorAll('.article-hero');
    if (heroFigures.length) {
        var lightbox = null;
        var lightboxImg = null;
        var lastFocus = null;

        function ensureLightbox() {
            if (lightbox) return;
            lightbox = document.createElement('div');
            lightbox.className = 'image-lightbox';
            lightbox.setAttribute('role', 'dialog');
            lightbox.setAttribute('aria-modal', 'true');
            lightbox.setAttribute('aria-label', 'Visualizacao ampliada da imagem');
            lightbox.innerHTML = '<button type="button" class="image-lightbox-close" aria-label="Fechar">&times;</button><img alt="">';
            document.body.appendChild(lightbox);
            lightboxImg = lightbox.querySelector('img');

            lightbox.addEventListener('click', function (e) {
                if (e.target === lightbox || e.target.classList.contains('image-lightbox-close')) {
                    closeLightbox();
                }
            });
        }

        function openLightbox(src, alt) {
            ensureLightbox();
            lightboxImg.src = src;
            lightboxImg.alt = alt || '';
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
            lastFocus = document.activeElement;
            var closeBtn = lightbox.querySelector('.image-lightbox-close');
            if (closeBtn) closeBtn.focus();
        }

        function closeLightbox() {
            if (!lightbox) return;
            lightbox.classList.remove('active');
            document.body.style.overflow = '';
            if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        }

        heroFigures.forEach(function (fig) {
            var img = fig.querySelector('img');
            if (!img) return;
            fig.setAttribute('role', 'button');
            fig.setAttribute('tabindex', '0');
            fig.setAttribute('aria-label', 'Ampliar imagem: ' + (img.alt || ''));
            fig.addEventListener('click', function () { openLightbox(img.src, img.alt); });
            fig.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openLightbox(img.src, img.alt);
                }
            });
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && lightbox && lightbox.classList.contains('active')) {
                closeLightbox();
            }
        });
    }

    // ========== 9. MID-ARTICLE CTA (CONTEXTUAL) ==========
    // Maps article category/slug to the most relevant LP.
    // Falls back to generic /index.html#contato when no rule matches.
    if (document.querySelector('.article-body')) {
        var ctaMap = [
            { match: /pentest|red team|offensive|ofensiv|bug bounty|exploit/i, url: '/lp/pentest/', title: 'Quer testar suas defesas?', desc: 'Pentest profissional com relat\u00f3rio executivo e t\u00e9cnico.', label: 'Solicitar Pentest' },
            { match: /lgpd|privacidade|dados pessoais|data protection|dpo/i, url: '/lp/lgpd/', title: 'Sua empresa est\u00e1 em conformidade com a LGPD?', desc: 'Adequa\u00e7\u00e3o LGPD com diagn\u00f3stico, plano de a\u00e7\u00e3o e DPO as a Service.', label: 'Adequar \u00e0 LGPD' },
            { match: /cloud|aws|azure|gcp|cspm|kubernetes|container/i, url: '/lp/cloud-security/', title: 'Sua nuvem est\u00e1 segura?', desc: 'Avalia\u00e7\u00e3o de postura cloud (CSPM/KSPM) em AWS, Azure e GCP.', label: 'Avaliar Cloud' },
            { match: /devsecops|appsec|api|sast|dast|sbom|graphql/i, url: '/lp/application-security/', title: 'Seu c\u00f3digo \u00e9 seguro desde o design?', desc: 'AppSec/DevSecOps: SAST, DAST, SBOM e seguran\u00e7a no SDLC.', label: 'Proteger Aplica\u00e7\u00f5es' },
            { match: /grc|governan|compliance|auditoria|risco|iso 27001|nis2/i, url: '/lp/grc/', title: 'Como est\u00e1 sua maturidade em GRC?', desc: 'Programa de Governan\u00e7a, Riscos e Compliance sob medida.', label: 'Diagnosticar GRC' },
            { match: /soc|siem|soar|xdr|edr|ndr|detection|threat hunt/i, url: '/lp/csoc/', title: 'Precisa de monitoramento 24x7?', desc: 'Cyber SOC com detec\u00e7\u00e3o, resposta e threat hunting.', label: 'Conhecer o cSOC' },
            { match: /threat intel|cti|inteligencia|intelig\u00eancia|osint/i, url: '/lp/cti-monitoramento/', title: 'Antecipe-se \u00e0s amea\u00e7as.', desc: 'Cyber Threat Intelligence operacional para sua superf\u00edcie de risco.', label: 'Conhecer CTI' },
            { match: /ransomware|incident|resposta|forense|breach/i, url: '/lp/resposta-incidentes/', title: 'Sofreu um incidente?', desc: 'Resposta a incidentes 24x7 com conten\u00e7\u00e3o e recupera\u00e7\u00e3o.', label: 'Acionar Resposta' },
            { match: /vulnerab|cvss|cve|patch/i, url: '/lp/analise-vulnerabilidades/', title: 'Conhece suas vulnerabilidades cr\u00edticas?', desc: 'An\u00e1lise de vulnerabilidades com prioriza\u00e7\u00e3o por risco real.', label: 'Solicitar An\u00e1lise' },
            { match: /ot|ics|scada|industrial|infraestrutura cr/i, url: '/lp/seguranca-ot-ics/', title: 'Protege seu ambiente OT/ICS?', desc: 'Seguran\u00e7a para SCADA e infraestruturas cr\u00edticas.', label: 'Proteger OT/ICS' },
            { match: /email|spf|dkim|dmarc|phishing|spoofing/i, url: '/lp/monitorar-emails/', title: 'Seu dom\u00ednio est\u00e1 protegido?', desc: 'Monitoramento de e-mail, marca e abuse de dom\u00ednio.', label: 'Monitorar E-mails' },
            { match: /awareness|conscienti|treinamento|engenharia social/i, url: '/lp/conscientizacao-treinamento/', title: 'Pessoas s\u00e3o seu primeiro per\u00edmetro.', desc: 'Programa de conscientiza\u00e7\u00e3o com simula\u00e7\u00e3o de phishing.', label: 'Conhecer Programa' },
            { match: /terceiros|tprm|supply chain|due diligence/i, url: '/lp/gestao-riscos-terceiros/', title: 'Conhece o risco dos seus fornecedores?', desc: 'Gest\u00e3o de risco de terceiros (TPRM) ponta a ponta.', label: 'Avaliar Terceiros' },
            { match: /forense|investiga|computa.{0,2}forense/i, url: '/lp/computacao-forense/', title: 'Precisa de evid\u00eancias t\u00e9cnicas?', desc: 'Computa\u00e7\u00e3o forense com cadeia de cust\u00f3dia e laudo.', label: 'Solicitar Per\u00edcia' },
            { match: /fraude|cartao|cart\u00e3o|golpe/i, url: '/lp/prevencao-fraudes/', title: 'Reduza perdas com fraudes.', desc: 'Preven\u00e7\u00e3o e resposta a fraudes digitais.', label: 'Conhecer Solu\u00e7\u00e3o' }
        ];

        function pickCta() {
            var section = (document.querySelector('meta[property="article:section"]') || {}).content || '';
            var keywords = (document.querySelector('meta[name="keywords"]') || {}).content || '';
            var slug = location.pathname;
            var hay = (section + ' ' + keywords + ' ' + slug).toLowerCase();
            for (var i = 0; i < ctaMap.length; i++) {
                if (ctaMap[i].match.test(hay)) return ctaMap[i];
            }
            return { url: '/index.html#contato', title: 'Precisa de ajuda especializada?', desc: 'Fale com nossos consultores sobre seu projeto de seguran\u00e7a.', label: 'Falar com Especialista' };
        }
        var cta = pickCta();

        var ctaDiv = document.createElement('div');
        ctaDiv.className = 'mid-article-cta';
        var utm = (cta.url.indexOf('?') === -1 ? '?' : '&') + 'utm_source=site&utm_medium=mid-article&utm_campaign=blog-cta';
        ctaDiv.innerHTML = '<div class="mid-article-cta-text"><strong>' + cta.title + '</strong>' + cta.desc + '</div><a href="' + cta.url + utm + '" class="cta-btn">' + cta.label + '</a><button class="mid-article-cta-close" aria-label="Fechar">\u00d7</button>';
        document.body.appendChild(ctaDiv);

        var ctaDismissed = false;
        var ctaClose = ctaDiv.querySelector('.mid-article-cta-close');
        ctaClose.addEventListener('click', function () {
            ctaDismissed = true;
            ctaDiv.classList.add('dismissed');
            ctaDiv.classList.remove('visible');
        });

        var articleBody = document.querySelector('.article-body');
        var articleHeight = articleBody.offsetHeight;
        var ctaTicking = false;
        window.addEventListener('scroll', function () {
            if (ctaDismissed || ctaTicking) return;
            ctaTicking = true;
            requestAnimationFrame(function () {
                var scrolled = -articleBody.getBoundingClientRect().top;
                var progress = scrolled / articleHeight;
                if (progress > 0.4 && progress < 0.95) {
                    ctaDiv.classList.add('visible');
                } else {
                    ctaDiv.classList.remove('visible');
                }
                ctaTicking = false;
            });
        }, { passive: true });
    }

    // ========== 9b. RELATED TOOLS (auto-injected on /ferramentas/<tool>/) ==========
    // Detects tool pages and appends a "Ferramentas Relacionadas" block before the footer.
    (function () {
        var m = location.pathname.match(/^\/ferramentas\/([^\/]+)\/?$/);
        if (!m) return;
        var current = m[1];
        if (current === 'index.html' || !current) return;

        var tools = {
            'calculadora-cvss':            { name: 'Calculadora CVSS 3.1 e 4.0', desc: 'Avalie severidade de vulnerabilidades.', icon: 'fa-calculator', tags: ['vuln', 'cvss', 'risco'] },
            'calculadora-risco-owasp':     { name: 'Calculadora de Risco OWASP', desc: 'Likelihood × Impact em matriz 3x3.', icon: 'fa-chart-line', tags: ['risco', 'owasp', 'pentest'] },
            'gerador-de-senhas':           { name: 'Gerador de Senhas', desc: 'Senhas e passphrases seguras.', icon: 'fa-key', tags: ['senha', 'password'] },
            'validador-politica-senhas':   { name: 'Validador de Política de Senhas', desc: 'NIST, ISO e PCI com entropia.', icon: 'fa-shield-alt', tags: ['senha', 'password', 'compliance'] },
            'validador-spf-dkim-dmarc':    { name: 'Validador SPF, DKIM e DMARC', desc: 'Análise de autenticação de e-mail.', icon: 'fa-envelope-open-text', tags: ['email', 'dns', 'phishing'] },
            'codificador-base64-url-hex':  { name: 'Codificador Base64, URL, Hex', desc: 'Encode/decode rápido para pentest.', icon: 'fa-code', tags: ['encoding', 'pentest', 'jwt'] },
            'calculadora-hash':            { name: 'Calculadora de Hash', desc: 'MD5, SHA-1, SHA-256, SHA-512.', icon: 'fa-fingerprint', tags: ['hash', 'integridade', 'ioc'] },
            'decoder-jwt':                 { name: 'Decoder JWT', desc: 'Decode e análise de segurança.', icon: 'fa-key', tags: ['jwt', 'pentest', 'encoding'] },
            'security-headers':            { name: 'Analisador de Security Headers', desc: 'HSTS, CSP, X-Frame-Options - nota A+ a F.', icon: 'fa-shield-virus', tags: ['headers', 'web', 'hardening', 'csp'] },
            'conversor-timestamps':        { name: 'Conversor de Timestamps', desc: 'Unix, ISO 8601, FILETIME, Cocoa, LDAP.', icon: 'fa-clock', tags: ['forense', 'ir', 'logs'] },
            'calculadora-epss':            { name: 'Consulta EPSS por CVE', desc: 'Probabilidade de exploração em 30 dias.', icon: 'fa-chart-line', tags: ['vuln', 'cve', 'priorizacao'] },
            'parser-iocs':                 { name: 'Parser e Normalizador de IOCs', desc: 'Extração, defang/refang, pivot links.', icon: 'fa-fingerprint', tags: ['cti', 'ioc', 'hunting'] },
            'validador-dns':               { name: 'Validador DNS e DNSSEC', desc: 'A/AAAA/MX/NS/SOA/TXT/CAA + DNSKEY/DS via DoH.', icon: 'fa-network-wired', tags: ['dns', 'dnssec', 'caa', 'doh'] },
            'parser-x509':                 { name: 'Parser de Certificados X.509', desc: 'Subject/issuer/SAN/extensões + fingerprint SHA-256.', icon: 'fa-certificate', tags: ['x509', 'tls', 'pki', 'certificado'] }
        };

        // Curated relations by overlap of tags + manual tweaks
        var relations = {
            'calculadora-cvss':            ['calculadora-epss', 'calculadora-risco-owasp', 'calculadora-hash'],
            'calculadora-risco-owasp':     ['calculadora-cvss', 'calculadora-epss', 'validador-politica-senhas'],
            'gerador-de-senhas':           ['validador-politica-senhas', 'calculadora-hash', 'decoder-jwt'],
            'validador-politica-senhas':   ['gerador-de-senhas', 'calculadora-risco-owasp', 'calculadora-hash'],
            'validador-spf-dkim-dmarc':    ['validador-dns', 'security-headers', 'decoder-jwt'],
            'codificador-base64-url-hex':  ['decoder-jwt', 'calculadora-hash', 'parser-iocs'],
            'calculadora-hash':            ['codificador-base64-url-hex', 'parser-iocs', 'parser-x509'],
            'decoder-jwt':                 ['codificador-base64-url-hex', 'security-headers', 'validador-spf-dkim-dmarc'],
            'security-headers':            ['validador-spf-dkim-dmarc', 'validador-dns', 'parser-x509'],
            'conversor-timestamps':        ['parser-iocs', 'calculadora-hash', 'codificador-base64-url-hex'],
            'calculadora-epss':            ['calculadora-cvss', 'calculadora-risco-owasp', 'parser-iocs'],
            'parser-iocs':                 ['calculadora-hash', 'conversor-timestamps', 'codificador-base64-url-hex'],
            'validador-dns':               ['validador-spf-dkim-dmarc', 'security-headers', 'parser-x509'],
            'parser-x509':                 ['validador-dns', 'security-headers', 'calculadora-hash']
        };

        var related = relations[current];
        if (!related || !related.length) return;

        var section = document.createElement('section');
        section.className = 'related-tools';
        section.setAttribute('aria-label', 'Ferramentas relacionadas');
        var html = '<div class="container"><h2 class="related-tools-title">Ferramentas Relacionadas</h2><div class="related-tools-grid">';
        related.forEach(function (slug) {
            var t = tools[slug];
            if (!t) return;
            html += '<a class="related-tool-card" href="../' + slug + '/"><span class="related-tool-icon"><i class="fas ' + t.icon + '"></i></span><span class="related-tool-name">' + t.name + '</span><span class="related-tool-desc">' + t.desc + '</span></a>';
        });
        html += '</div><a href="../" class="related-tools-all">Ver todas as ferramentas <i class="fas fa-arrow-right"></i></a></div>';
        section.innerHTML = html;

        var footer = document.querySelector('footer.footer-section');
        if (footer && footer.parentNode) {
            footer.parentNode.insertBefore(section, footer);
        } else {
            document.body.appendChild(section);
        }
    })();

    // ========== 10. NEWSLETTER FORM (kebab-case ids) ==========
    // Targets blog-article markup: #newsletter-form / #newsletter-email / #newsletter-message
    // Posts to the same Google Apps Script endpoint used elsewhere.
    var nlForm = document.getElementById('newsletter-form');
    if (nlForm) {
        var nlEmail = document.getElementById('newsletter-email');
        var nlMsg = document.getElementById('newsletter-message');
        var nlBtn = nlForm.querySelector('.newsletter-btn');

        var publicDomains = ['gmail.com','gmail.com.br','googlemail.com','outlook.com','outlook.com.br','hotmail.com','hotmail.com.br','live.com','live.com.br','msn.com','yahoo.com','yahoo.com.br','ymail.com','rocketmail.com','icloud.com','me.com','mac.com','aol.com','aol.com.br','protonmail.com','protonmail.ch','proton.me','zoho.com','zohomail.com','mail.com','email.com','uol.com.br','bol.com.br','terra.com.br','ig.com.br','globo.com','globomail.com','r7.com','zipmail.com.br','oi.com.br','pop.com.br'];
        var tempDomains = ['tempmail.com','temp-mail.org','guerrillamail.com','mailinator.com','10minutemail.com','throwaway.email','fakeinbox.com','trashmail.com','dispostable.com','yopmail.com','sharklasers.com','getairmail.com'];

        function nlShow(text, type) {
            if (!nlMsg) return;
            nlMsg.textContent = text;
            nlMsg.className = 'newsletter-message ' + type;
            nlMsg.style.display = 'block';
            if (type === 'success') {
                setTimeout(function () { nlMsg.style.display = 'none'; }, 5000);
            }
        }

        function nlValidate(email) {
            var lower = (email || '').toLowerCase().trim();
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(lower)) {
                return { valid: false, message: 'Por favor, informe um e-mail valido.' };
            }
            var domain = lower.split('@')[1];
            if (publicDomains.indexOf(domain) !== -1) {
                return { valid: false, message: 'Por favor, utilize seu e-mail corporativo. E-mails pessoais nao sao aceitos.' };
            }
            if (tempDomains.indexOf(domain) !== -1 || tempDomains.some(function (d) { return domain.indexOf(d) !== -1; })) {
                return { valid: false, message: 'E-mails temporarios nao sao permitidos.' };
            }
            return { valid: true };
        }

        function nlFetchIp() {
            return Promise.race([
                fetch('/cdn-cgi/trace', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }),
                new Promise(function (_, rej) { setTimeout(rej, 2500); })
            ]).then(function (text) {
                var m = (text || '').match(/(?:^|\n)ip=([^\n]+)/);
                return m && m[1] ? m[1].trim() : '';
            }).catch(function () { return ''; });
        }

        nlForm.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!nlEmail || !nlBtn) return;

            var email = nlEmail.value.trim();
            var v = nlValidate(email);
            if (!v.valid) { nlShow(v.message, 'error'); return; }

            var originalText = nlBtn.innerHTML;
            nlBtn.disabled = true;
            nlBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

            var slug = location.pathname.replace(/^\/blog\//, '').replace(/\/$/, '') || 'blog';
            var origem = 'Blog: ' + slug;

            nlFetchIp().then(function (ip) {
                return fetch('https://script.google.com/a/inteligenciabrasil.seg.br/macros/s/AKfycbzzkHQxLsw0M5wU1LF2maVkF_piJiERJU34NCzE9g/exec', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'email=' + encodeURIComponent(email) + '&origem=' + encodeURIComponent(origem) + '&servico=Newsletter&ip=' + encodeURIComponent(ip)
                });
            }).then(function (res) { return res.json(); })
                .then(function (response) {
                    var result = (typeof response === 'object') ? response.result || response.status || 'success' : response;
                    if (result === 'success' || result === 'ok') {
                        nlForm.reset();
                        nlShow('Inscricao realizada com sucesso! Voce recebera nossos conteudos em breve.', 'success');
                    } else {
                        nlShow('Erro ao realizar inscricao. Tente novamente.', 'error');
                    }
                    nlBtn.disabled = false;
                    nlBtn.innerHTML = originalText;
                })
                .catch(function () {
                    nlShow('Erro de conexao. Verifique sua internet e tente novamente.', 'error');
                    nlBtn.disabled = false;
                    nlBtn.innerHTML = originalText;
                });
        });
    }

})();
