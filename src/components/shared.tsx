// Taken from https://github.com/Teppichseite/DeckPass/blob/main/src/components/shared.tsx
//
// Copyright (C) 2025 Teppichseite
// Licensed under the GNU General Public License v3.0 or (at your option) any later version.
//
// Modifications Copyright (C) 2025-2026 Teppichseite
// Licensed under the GNU General Public License v3.0 or (at your option) any later version.

export interface ButtonItemIconContentProps {
  children: React.ReactNode;
  icon: React.ReactNode;
}

export const ButtonItemIconContent = (props: ButtonItemIconContentProps) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    {props.icon}
    <div
      style={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        marginLeft: "15px",
      }}
    >
      {props.children}
    </div>
  </div>
);
