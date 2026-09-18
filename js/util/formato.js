export const formatarPreco = (v) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const bandeiras = { PT: '🇵🇹', CL: '🇨🇱', ES: '🇪🇸', AR: '🇦🇷', BR: '🇧🇷', FR: '🇫🇷' };

export const caminhoFoto  = (id) => `media/fotos/${id}.webp`;
export const caminhoVideo = (id) => `media/videos/${id}.mp4`;
