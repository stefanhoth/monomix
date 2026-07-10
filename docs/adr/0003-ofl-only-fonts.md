# Bundled fonts must be SIL OFL, CC0, or Apache licensed

The app redistributes fonts (bundled in the PWA) and users export the resulting paths for potentially commercial use (crafting/Cricut scene). Only licenses that unambiguously allow redistribution, embedding, and commercial use of outputs qualify: SIL OFL, CC0, Apache. "Free for personal use" fonts (DaFont etc.) are explicitly excluded — they cover neither our redistribution nor users' commercial output. License texts ship with the app; an about page credits every font.

Consequence: the pool of true monogram fonts is small, so some Designs will be derived algorithmically from regular OFL fonts (see ADR 0001). Decision marked "for now" — may be revisited if the design catalog can't reach its target.
