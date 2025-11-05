export function LoadingSpinner({ size = "default" }) {
  const sizeClasses = {
    small: "w-4 h-4 border-2",
    default: "w-8 h-8 border-3",
    large: "w-12 h-12 border-4"
  };

  return (
    <div className="flex items-center justify-center">
      <div 
        className={`${sizeClasses[size]} border-[#330019] border-t-transparent rounded-full animate-spin`}
      />
    </div>
  );
}
