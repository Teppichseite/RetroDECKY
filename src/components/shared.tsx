// Taken from https://github.com/Teppichseite/DeckPass/blob/main/src/components/shared.tsx

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
