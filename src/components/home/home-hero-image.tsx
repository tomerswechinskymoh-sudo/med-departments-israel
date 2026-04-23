export function HomeHeroImage() {
  return (
    <div className="relative isolate min-h-[420px] overflow-hidden rounded-[2rem] border border-brand-100/70 bg-gradient-to-br from-[#081b2d] via-[#12395b] to-[#2c6d99] shadow-panel">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(125,211,252,0.2),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.05),transparent_40%)]" />
      <div className="absolute -left-12 top-10 h-40 w-40 rounded-full bg-cyan-200/18 blur-3xl" />
      <div className="absolute bottom-6 right-8 h-48 w-48 rounded-full bg-brand-200/12 blur-3xl" />

      <svg
        viewBox="0 0 860 980"
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="איור בגווני כחול של רופאה צעירה בתחילת הדרך בסביבה קלינית"
      >
        <defs>
          <linearGradient id="hero-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0b2136" />
            <stop offset="48%" stopColor="#163f63" />
            <stop offset="100%" stopColor="#2f79a8" />
          </linearGradient>
          <linearGradient id="panel-fill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
          </linearGradient>
          <linearGradient id="coat-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f9fdff" />
            <stop offset="100%" stopColor="#d7e6f2" />
          </linearGradient>
          <linearGradient id="scrubs-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#98c5de" />
            <stop offset="100%" stopColor="#4f8eb6" />
          </linearGradient>
          <linearGradient id="skin-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f7d4c3" />
            <stop offset="100%" stopColor="#e7b9a3" />
          </linearGradient>
          <linearGradient id="hair-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#32283f" />
            <stop offset="100%" stopColor="#181428" />
          </linearGradient>
        </defs>

        <rect width="860" height="980" fill="url(#hero-bg)" />

        <g opacity="0.55">
          <rect x="68" y="110" width="174" height="574" rx="34" fill="url(#panel-fill)" />
          <rect x="106" y="152" width="98" height="112" rx="24" fill="rgba(255,255,255,0.12)" />
          <rect x="106" y="294" width="98" height="10" rx="5" fill="rgba(255,255,255,0.3)" />
          <rect x="106" y="322" width="74" height="10" rx="5" fill="rgba(255,255,255,0.18)" />
          <rect x="106" y="420" width="98" height="112" rx="24" fill="rgba(255,255,255,0.1)" />
          <circle cx="155" cy="208" r="22" fill="rgba(125,211,252,0.2)" />
          <path
            d="M155 182v52M129 208h52"
            stroke="rgba(255,255,255,0.38)"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </g>

        <g opacity="0.3">
          <circle cx="736" cy="186" r="86" fill="rgba(255,255,255,0.1)" />
          <circle cx="682" cy="784" r="114" fill="rgba(125,211,252,0.12)" />
          <circle cx="240" cy="792" r="92" fill="rgba(255,255,255,0.06)" />
        </g>

        <g transform="translate(330 126)">
          <ellipse cx="166" cy="300" rx="204" ry="248" fill="rgba(255,255,255,0.1)" />

          <path
            d="M102 342c-84 0-158 64-175 158l-18 92h512l-22-104c-20-89-90-146-170-146h-127z"
            fill="url(#coat-fill)"
          />
          <path
            d="M145 352l57 62 62-62 63 212H79z"
            fill="url(#scrubs-fill)"
            opacity="0.96"
          />
          <path
            d="M158 353l43 49 48-49"
            fill="none"
            stroke="#f5fbff"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <rect x="181" y="248" width="52" height="82" rx="24" fill="url(#skin-fill)" />
          <ellipse cx="207" cy="174" rx="94" ry="112" fill="url(#skin-fill)" />

          <path
            d="M112 168c0-82 47-133 118-133 60 0 101 39 111 98 6 34 3 87-11 121-17-26-24-66-27-94-42 26-104 38-172 35-4 38-10 67-19 89-12-22-21-69-21-116z"
            fill="url(#hair-fill)"
          />
          <path
            d="M134 119c22-46 61-71 110-71 36 0 72 16 92 50-25-8-56-10-83-4-42 10-78 39-119 75z"
            fill="rgba(255,255,255,0.06)"
          />
          <path
            d="M138 193c11 52 39 95 69 120 20 16 31 21 43 21 16 0 33-9 54-28 24-21 50-58 60-113-38 15-88 23-157 21-31-1-54-7-69-21z"
            fill="rgba(255,255,255,0.08)"
          />

          <ellipse cx="171" cy="182" rx="10" ry="6" fill="#22334b" />
          <ellipse cx="248" cy="182" rx="10" ry="6" fill="#22334b" />
          <path
            d="M174 230c17 18 63 18 79 0"
            fill="none"
            stroke="#9d5f5f"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M210 189c-5 18-9 33-10 47 10 5 20 6 31 2"
            fill="none"
            stroke="rgba(98,60,60,0.4)"
            strokeWidth="4"
            strokeLinecap="round"
          />

          <path
            d="M101 342l-28 104 92-44 41-48-60-2zM315 342l28 104-92-44-41-48 60-2z"
            fill="#f4fbff"
            opacity="0.95"
          />

          <path
            d="M156 394c-30 12-52 39-58 69l-10 52"
            fill="none"
            stroke="#557fa0"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M259 394c29 12 49 37 55 66l11 55"
            fill="none"
            stroke="#557fa0"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <circle cx="94" cy="527" r="26" fill="none" stroke="#557fa0" strokeWidth="10" />
          <circle cx="325" cy="529" r="26" fill="none" stroke="#557fa0" strokeWidth="10" />
        </g>
      </svg>

      <div className="absolute inset-0 bg-gradient-to-t from-brand-900/72 via-brand-900/16 to-transparent" />

      <div className="absolute inset-x-6 bottom-6 flex max-w-sm flex-col gap-3 text-white">
        <span className="inline-flex w-fit rounded-full border border-white/16 bg-white/8 px-4 py-2 text-xs font-semibold backdrop-blur-xl">
          צעירה, מקצועית, קרובה לשטח
        </span>
        <h2 className="text-2xl font-bold leading-tight">
          ויזואל שנבנה לרופאה בתחילת הדרך, עם אווירה קלינית רגועה ומדויקת.
        </h2>
      </div>
    </div>
  );
}
