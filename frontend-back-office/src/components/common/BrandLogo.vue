<template>
  <div class="inline-flex items-center justify-center gap-3 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 shadow-sm backdrop-blur-md">
    
    <!-- Ikon diperbesar sedikit (w-5 h-5) agar proporsional dengan teks -->
    <svg class="w-5 h-5 text-primary shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 8h1a4 4 0 1 1 0 8h-1"></path>
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"></path>
      <line x1="6" y1="1" x2="6" y2="4"></line>
      <line x1="10" y1="1" x2="10" y2="4"></line>
      <line x1="14" y1="1" x2="14" y2="4"></line>
    </svg>

    <!-- Wadah Teks: Flex kolom untuk menumpuk atas-bawah dan rata tengah -->
    <div class="flex flex-col items-center justify-center mt-0.5">
      <span class="text-sm font-bold uppercase tracking-widest text-primary leading-none">
        SELARASA
      </span>
      <span class="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary/80 leading-none mt-1">
        Back Office
      </span>
    </div>

  </div>
</template>