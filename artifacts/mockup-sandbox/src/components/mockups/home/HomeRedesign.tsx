import oldSignin from "./old-signin.png";

export function HomeRedesign() {
  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#070718",
      }}
    >
      <img
        src={oldSignin}
        alt="Old sign-in screen"
        style={{
          maxHeight: "100vh",
          maxWidth: "100%",
          objectFit: "contain",
          borderRadius: 16,
        }}
      />
    </div>
  );
}
