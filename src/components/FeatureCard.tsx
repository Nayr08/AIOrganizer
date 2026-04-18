import React from "react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  featured?: boolean;
  className?: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  featured = false,
  className = "",
}: FeatureCardProps) {
  return (
    <article
      className={`landing-feature-card ${featured ? "featured" : ""} ${className}`}
    >
      <div className="landing-feature-icon">
        {icon}
      </div>
      <h3 className="landing-feature-title">{title}</h3>
      <p className="landing-feature-body">{description}</p>
    </article>
  );
}
