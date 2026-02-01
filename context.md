This repository is the backend of an E-commerce app built in Node with a DB as well. For the purpose of a technical test, this app is to be deployed via CI/CD in Kubernetes. Here's the specifications of the technical interview:
You will deploy one application (an application you own) as a containerized service using Docker & Kubernetes (via CI/CD)

Use a free-tier platform such as:
    • Google Cloud Platform (GKE)
    • AWS Free Tier (EKS)
    • Azure Free Tier (AKS)
    • DigitalOcean Kubernetes Free Trial
    • Minikube (local Kubernetes)

B1 – Dockerize the App
Candidate must:
    • Create Dockerfile
    • Build image
    • Test locally
Deliverables:
    • Dockerfile
    • docker run

B2 – CI/CD Pipeline
Design pipeline:
    • Git push
    •   ↓
    • Build Docker image
    •   ↓
    • Push to registry
    •   ↓
    • Deploy to Kubernetes
Using:
    • GitHub Actions 
Deliverables:
    • Pipeline YAML
    • Explanation

B3 – Kubernetes Deployment
Deploy Dockerized app into Kubernetes:
    • Deployment
    • Service
    • (Optional) Ingress
    • (Optional) HPA
Deliverables:
    • manifests
    • service reachable

PART C – Visibility (Optional)
Add minimal monitoring:
    • PM2 logs
    • Or Node Exporter
    • Or simple Prometheus